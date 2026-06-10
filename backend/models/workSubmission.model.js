import mongoose from "mongoose";

export const WORK_STATUSES = [
  "Pending",
  "Under Review",
  "Documents Required",
  "In Process",
  "Completed",
  "Rejected",
];

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "General" },
    url: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    version: { type: Number, default: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
    requestLabel: { type: String },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: WORK_STATUSES },
    newStatus: { type: String, enum: WORK_STATUSES, required: true },
    reason: { type: String, trim: true },
    remark: { type: String, trim: true },
    internalNote: { type: String, trim: true },
    requestedDocuments: [{ type: String, trim: true }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const auditLogSchema = new mongoose.Schema(
  {
    actionType: { type: String, required: true },
    description: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    userRole: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const workSubmissionSchema = new mongoose.Schema(
  {
    workId: { type: String, unique: true, index: true },
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division", required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    servicePrice: { type: Number, min: 0 },
    associateEarningPercent: { type: Number, default: 20, min: 0, max: 100 },
    associateEarningAmount: { type: Number, min: 0 },
    clientDetails: {
      clientName: { type: String, required: true, trim: true, index: true },
      mobileNumber: { type: String, trim: true, index: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    documents: [documentSchema],
    status: { type: String, enum: WORK_STATUSES, default: "Pending", index: true },
    expectedCompletionDate: { type: Date },
    completedAt: { type: Date },
    statusHistory: [statusHistorySchema],
    auditLogs: [auditLogSchema],
  },
  { timestamps: true }
);

workSubmissionSchema.index({ createdAt: -1 });
workSubmissionSchema.index({ "clientDetails.clientName": "text", workId: "text", "clientDetails.mobileNumber": "text" });

workSubmissionSchema.pre("save", async function (next) {
  if (this.workId) return next();
  const count = await mongoose.model("WorkSubmission").countDocuments();
  this.workId = `WORK-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  next();
});

const WorkSubmission = mongoose.model("WorkSubmission", workSubmissionSchema);
export default WorkSubmission;
