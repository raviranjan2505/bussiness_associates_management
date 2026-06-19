import mongoose from "mongoose";

export const COMPLAINT_STATUSES = ["Pending", "In Review", "Resolved", "Closed"];

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: { type: String, unique: true, index: true },
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },

    relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    relatedWork: { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission" },

    status: { type: String, enum: COMPLAINT_STATUSES, default: "Pending", index: true },

    internalNotes: { type: [internalNoteSchema], default: [] },

    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ associate: 1, status: 1 });
complaintSchema.index({ subject: "text", description: "text", complaintNumber: "text" });

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
