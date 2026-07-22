import ExcelJS from "exceljs";
import User from "../models/user.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import Lead from "../models/lead.model.js";
import Kyc from "../models/kyc.model.js";
import { errorHandler } from "../utils/error.js";

// Get all associates (admin only)
export const getUsers = async (req, res, next) => {
  try {
    const associates = await User.find({ role: "associate" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();
    const associateIds = associates.map((a) => a._id);

    // Single aggregation each — avoids N+1 queries (one per associate).
    // $match on associate: { $in: associateIds } only counts leads/work
    // whose `associate` field is a real, still-existing associate id, so
    // each document is attributed to exactly one associate here.
    const [incomeAgg, leadsAgg, worksAgg] = await Promise.all([
      WorkSubmission.aggregate([
        { $match: { status: "Completed", associate: { $in: associateIds } } },
        { $group: { _id: "$associate", totalIncome: { $sum: { $ifNull: ["$associateEarningAmount", 0] } } } },
      ]),
      Lead.aggregate([
        { $match: { associate: { $in: associateIds } } },
        { $group: { _id: "$associate", count: { $sum: 1 } } },
      ]),
      WorkSubmission.aggregate([
        { $match: { associate: { $in: associateIds } } },
        { $group: { _id: "$associate", count: { $sum: 1 } } },
      ]),
    ]);

    const incomeMap = new Map(incomeAgg.map((r) => [String(r._id), r.totalIncome]));
    const leadsMap = new Map(leadsAgg.map((r) => [String(r._id), r.count]));
    const worksMap = new Map(worksAgg.map((r) => [String(r._id), r.count]));

    const associatesWithCounts = associates.map((associate) => ({
      ...associate,
      totalIncome: incomeMap.get(String(associate._id)) || 0,
      leadsCount: leadsMap.get(String(associate._id)) || 0,
      worksCount: worksMap.get(String(associate._id)) || 0,
    }));

    res.status(200).json(associatesWithCounts);
  } catch (err) { next(err); }
};

export const exportUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "associate" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Mobile, address, Aadhaar, PAN and bank details all live on the Kyc
    // record (submitted separately from signup), not on the User document
    // itself — fetch them in one query and key by associate id.
    const kycRecords = await Kyc.find({ user: { $in: users.map((u) => u._id) } }).lean();
    const kycByUser = new Map(kycRecords.map((k) => [String(k.user), k]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Associates");

    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Mobile", key: "mobile", width: 16 },
      { header: "Address", key: "address", width: 35 },
      { header: "Aadhaar Number", key: "aadhaarNumber", width: 18 },
      { header: "PAN Number", key: "panNumber", width: 14 },
      { header: "Bank Account Holder", key: "accountHolderName", width: 25 },
      { header: "Bank Name", key: "bankName", width: 22 },
      { header: "Account Number", key: "accountNumber", width: 20 },
      { header: "IFSC Code", key: "ifscCode", width: 14 },
      { header: "UPI ID", key: "upiId", width: 20 },
      { header: "KYC Status", key: "kycStatus", width: 14 },
      { header: "Joined On", key: "createdAt", width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };

    users.forEach((user) => {
      const kyc = kycByUser.get(String(user._id));
      worksheet.addRow({
        name: user.name || "",
        email: user.email || "",
        mobile: kyc?.mobile || "",
        address: kyc?.address || "",
        aadhaarNumber: kyc?.aadhaarNumber || "",
        panNumber: kyc?.panNumber || "",
        accountHolderName: kyc?.bankDetails?.accountHolderName || "",
        bankName: kyc?.bankDetails?.bankName || "",
        accountNumber: kyc?.bankDetails?.accountNumber || "",
        ifscCode: kyc?.bankDetails?.ifscCode || "",
        upiId: kyc?.bankDetails?.upiId || "",
        kycStatus: user.kycStatus || kyc?.status || "Pending",
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString() : "",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=associates.xlsx");

    const buffer = await workbook.xlsx.writeBuffer();
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

// Get single user by ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return next(errorHandler(404, "User not found"));
    res.status(200).json(user);
  } catch (err) { next(err); }
};