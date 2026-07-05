import User from "../models/user.model.js";
import Kyc from "../models/kyc.model.js";
import { errorHandler } from "../utils/error.js";

const toFileUrl = (req, file) => `${req.protocol}://${req.get("host")}/uploads/kyc/${file.filename}`;

const AADHAAR_REGEX = /^\d{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

// ── Associate: submit / resubmit KYC ───────────────────────────────────────
export const submitKyc = async (req, res, next) => {
  try {
    const existing = await Kyc.findOne({ user: req.user.id });

    // Once submitted, KYC can only be edited again if it was Rejected.
    if (existing && existing.status !== "Rejected") {
      return next(
        errorHandler(400, `Your KYC is already ${existing.status.toLowerCase()} and cannot be edited right now`)
      );
    }

    const {
      fullName,
      mobile,
      email,
      address,
      aadhaarNumber,
      panNumber,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    } = req.body;

    const required = { fullName, mobile, email, address, aadhaarNumber, panNumber, accountHolderName, bankName, accountNumber, ifscCode };
    for (const [key, value] of Object.entries(required)) {
      if (!value || !String(value).trim()) {
        return next(errorHandler(400, `${key} is required`));
      }
    }

    if (!MOBILE_REGEX.test(mobile.trim())) return next(errorHandler(400, "Enter a valid 10-digit mobile number"));
    if (!AADHAAR_REGEX.test(aadhaarNumber.trim())) return next(errorHandler(400, "Enter a valid 12-digit Aadhaar number"));
    if (!PAN_REGEX.test(panNumber.trim().toUpperCase())) return next(errorHandler(400, "Enter a valid PAN number"));
    if (!IFSC_REGEX.test(ifscCode.trim().toUpperCase())) return next(errorHandler(400, "Enter a valid IFSC code"));

    const files = req.files || {};
    const pickDoc = (field, fallback) => {
      const file = files[field]?.[0];
      if (file) {
        return { name: file.originalname, url: toFileUrl(req, file), mimeType: file.mimetype };
      }
      return fallback || undefined;
    };

    const aadhaarCard = pickDoc("aadhaarCard", existing?.documents?.aadhaarCard);
    const panCard = pickDoc("panCard", existing?.documents?.panCard);
    const bankProof = pickDoc("bankProof", existing?.documents?.bankProof);

    if (!aadhaarCard) return next(errorHandler(400, "Aadhaar Card document is required"));
    if (!panCard) return next(errorHandler(400, "PAN Card document is required"));
    if (!bankProof) return next(errorHandler(400, "Bank Passbook / Cancelled Cheque document is required"));

    const payload = {
      user: req.user.id,
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      aadhaarNumber: aadhaarNumber.trim(),
      panNumber: panNumber.trim().toUpperCase(),
      bankDetails: {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: (upiId || "").trim(),
      },
      documents: { aadhaarCard, panCard, bankProof },
      status: "Pending",
      rejectionReason: "",
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: new Date(),
    };

    const kyc = existing
      ? await Kyc.findOneAndUpdate({ user: req.user.id }, payload, { new: true })
      : await Kyc.create(payload);

    await User.findByIdAndUpdate(req.user.id, { kycStatus: "Pending" });

    res.status(200).json({ message: "KYC submitted successfully", kyc });
  } catch (error) {
    next(error);
  }
};

// ── Associate: view own KYC + status ───────────────────────────────────────
export const getMyKyc = async (req, res, next) => {
  try {
    const kyc = await Kyc.findOne({ user: req.user.id });
    const user = await User.findById(req.user.id).select("kycStatus");
    res.status(200).json({ kyc, kycStatus: user?.kycStatus || "Pending" });
  } catch (error) {
    next(error);
  }
};

// ── Admin: list all associates with their KYC status ───────────────────────
export const listKycRequests = async (req, res, next) => {
  try {
    const associates = await User.find({ role: "associate" })
      .select("name email createdAt kycStatus")
      .sort({ createdAt: -1 });

    const kycDocs = await Kyc.find({ user: { $in: associates.map((a) => a._id) } }).select("user mobile status");
    const kycByUser = new Map(kycDocs.map((k) => [String(k.user), k]));

    const requests = associates.map((a) => {
      const kyc = kycByUser.get(String(a._id));
      return {
        _id: a._id,
        name: a.name,
        email: a.email,
        mobile: kyc?.mobile || "—",
        registrationDate: a.createdAt,
        kycStatus: a.kycStatus,
        hasSubmittedKyc: !!kyc,
      };
    });

    res.status(200).json({ requests });
  } catch (error) {
    next(error);
  }
};

// ── Admin: view full KYC detail for one associate ───────────────────────────
export const getKycDetail = async (req, res, next) => {
  try {
    const associate = await User.findOne({ _id: req.params.userId, role: "associate" }).select(
      "name email createdAt kycStatus"
    );
    if (!associate) return next(errorHandler(404, "Associate not found"));

    const kyc = await Kyc.findOne({ user: req.params.userId }).populate("reviewedBy", "name email");
    res.status(200).json({ associate, kyc });
  } catch (error) {
    next(error);
  }
};

// ── Admin: approve KYC ───────────────────────────────────────────────────────
export const approveKyc = async (req, res, next) => {
  try {
    const kyc = await Kyc.findOne({ user: req.params.userId });
    if (!kyc) return next(errorHandler(404, "KYC submission not found"));

    kyc.status = "Approved";
    kyc.rejectionReason = "";
    kyc.reviewedBy = req.user.id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    await User.findByIdAndUpdate(req.params.userId, { kycStatus: "Approved" });

    res.status(200).json({ message: "KYC approved", kyc });
  } catch (error) {
    next(error);
  }
};

// ── Admin: reject KYC ─────────────────────────────────────────────────────────
export const rejectKyc = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return next(errorHandler(400, "A rejection reason is required"));
    }

    const kyc = await Kyc.findOne({ user: req.params.userId });
    if (!kyc) return next(errorHandler(404, "KYC submission not found"));

    kyc.status = "Rejected";
    kyc.rejectionReason = rejectionReason.trim();
    kyc.reviewedBy = req.user.id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    await User.findByIdAndUpdate(req.params.userId, { kycStatus: "Rejected" });

    res.status(200).json({ message: "KYC rejected", kyc });
  } catch (error) {
    next(error);
  }
};

// ── Admin: permanently delete an associate (e.g. fake/unknown registration) ─
export const deleteAssociate = async (req, res, next) => {
  try {
    const associate = await User.findOne({ _id: req.params.userId, role: "associate" });
    if (!associate) return next(errorHandler(404, "Associate not found"));

    await Kyc.findOneAndDelete({ user: req.params.userId });
    await User.findByIdAndDelete(req.params.userId);

    res.status(200).json({ message: "Associate deleted permanently" });
  } catch (error) {
    next(error);
  }
};