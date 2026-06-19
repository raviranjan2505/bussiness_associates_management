import Complaint, { COMPLAINT_STATUSES } from "../models/complaint.model.js";
import ComplaintReply from "../models/complaintReply.model.js";
import { errorHandler } from "../utils/error.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { generateSequenceNumber } from "../utils/sequence.js";

const toFileUrl = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/attachments/${file.filename}`;

const ensureComplaintAccess = (complaint, user) => {
  if (user.role === "admin") return true;
  return String(complaint.associate?._id || complaint.associate) === user.id;
};

export const createComplaint = async (req, res, next) => {
  try {
    const { subject, description, relatedInvoice, relatedWork } = req.body;
    if (!subject || !description) return next(errorHandler(400, "Subject and description are required"));

    const attachments = (req.files || []).map((file) => ({
      name: file.originalname,
      url: toFileUrl(req, file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const complaintNumber = await generateSequenceNumber(Complaint, "COMP");

    const complaint = await Complaint.create({
      complaintNumber,
      associate: req.user.id,
      subject,
      description,
      attachments,
      relatedInvoice: relatedInvoice || undefined,
      relatedWork: relatedWork || undefined,
      status: "Pending",
    });

    await notifyAdmins({
      title: "New complaint raised",
      message: `${complaint.complaintNumber}: ${subject}`,
      type: "Complaint Created",
      complaint: complaint._id,
    });

    res.status(201).json({ message: "Complaint submitted", complaint });
  } catch (error) {
    next(error);
  }
};

export const listComplaints = async (req, res, next) => {
  try {
    const { status, search, from, to } = req.query;
    const filter = {};

    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (status && COMPLAINT_STATUSES.includes(status)) filter.status = status;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    if (search) {
      filter.$or = [
        { complaintNumber: new RegExp(search, "i") },
        { subject: new RegExp(search, "i") },
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate("associate", "name email profileImageUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({ complaints });
  } catch (error) {
    next(error);
  }
};

export const getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("associate", "name email profileImageUrl")
      .populate("internalNotes.addedBy", "name");

    if (!complaint) return next(errorHandler(404, "Complaint not found"));
    if (!ensureComplaintAccess(complaint, req.user)) return next(errorHandler(403, "Access denied"));

    const replies = await ComplaintReply.find({ complaint: complaint._id })
      .populate("sender", "name email profileImageUrl role")
      .sort({ createdAt: 1 });

    res.status(200).json({ complaint, replies });
  } catch (error) {
    next(error);
  }
};

export const updateComplaint = async (req, res, next) => {
  try {
    const { status, internalNote } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(errorHandler(404, "Complaint not found"));

    if (status && COMPLAINT_STATUSES.includes(status)) {
      complaint.status = status;
      if (status === "Resolved") complaint.resolvedAt = new Date();
      if (status === "Closed") complaint.closedAt = new Date();
    }

    if (internalNote) {
      complaint.internalNotes.push({ note: internalNote, addedBy: req.user.id });
    }

    await complaint.save();

    if (status === "Resolved") {
      await notify({
        user: complaint.associate,
        title: "Complaint resolved",
        message: `Your complaint ${complaint.complaintNumber} has been resolved`,
        type: "Complaint Resolved",
        complaint: complaint._id,
      });
    }

    res.status(200).json({ message: "Complaint updated", complaint });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return next(errorHandler(400, "Message is required"));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(errorHandler(404, "Complaint not found"));
    if (!ensureComplaintAccess(complaint, req.user)) return next(errorHandler(403, "Access denied"));
    if (complaint.status === "Closed") return next(errorHandler(400, "Cannot reply to a closed complaint"));

    const attachments = (req.files || []).map((file) => ({
      name: file.originalname,
      url: toFileUrl(req, file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const reply = await ComplaintReply.create({
      complaint: complaint._id,
      message,
      attachments,
      sender: req.user.id,
      senderRole: req.user.role,
    });

    if (req.user.role === "admin") {
      await notify({
        user: complaint.associate,
        title: "Admin replied to your complaint",
        message: `New reply on complaint ${complaint.complaintNumber}`,
        type: "Complaint Replied",
        complaint: complaint._id,
      });
    } else {
      await notifyAdmins({
        title: "Associate replied to complaint",
        message: `Reply on ${complaint.complaintNumber}: ${complaint.subject}`,
        type: "Complaint Replied",
        complaint: complaint._id,
      });
    }

    const populated = await ComplaintReply.findById(reply._id).populate(
      "sender",
      "name email profileImageUrl role"
    );
    res.status(201).json({ message: "Reply added", reply: populated });
  } catch (error) {
    next(error);
  }
};
