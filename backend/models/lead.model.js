import mongoose from "mongoose";

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
    previousStatus: { type: String },
    newStatus: { type: String, required: true },
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

// Embedded service line for multi-service leads
const leadServiceSchema = new mongoose.Schema(
  {
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division" },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    associateEarningPercent: { type: Number, default: 20, min: 0, max: 100 },
    associateEarningAmount: { type: Number, default: 0, min: 0 },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    documents: [
      {
        name: { type: String, required: true },
        category: { type: String, default: "General" },
        url: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    leadId: { type: String, unique: true, index: true },
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // For multi-service leads, services[] is the source of truth.
    // division/service are kept for backward compat with single-service leads.
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division", index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", index: true },
    // Embedded services array (populated for multi-service submissions)
    services: { type: [leadServiceSchema], default: [] },
    servicePrice: { type: Number, min: 0 },
    associateEarningPercent: { type: Number, default: 20, min: 0, max: 100 },
    associateEarningAmount: { type: Number, min: 0 },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },
    clientDetails: {
      clientName: { type: String, required: true, trim: true, index: true },
      mobileNumber: { type: String, trim: true, index: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, trim: true },
    category: { type: String, trim: true },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    documents: [documentSchema],
    expectedCompletionDate: { type: Date },
    remarks: { type: String, trim: true },
    isConverted: { type: Boolean, default: false, index: true },
    convertedWorkId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission" },
    convertedAt: { type: Date },
    leadStatus: { type: String, default: "Submitted", index: true },
    adminViewed: { type: Boolean, default: false },
    viewedAt: { type: Date },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", index: true },
    statusHistory: [statusHistorySchema],
    auditLogs: [auditLogSchema],
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ "clientDetails.clientName": "text", leadId: "text", "clientDetails.mobileNumber": "text" });

leadSchema.pre("save", async function (next) {
  if (this.leadId) return next();
  const count = await mongoose.model("Lead").countDocuments();
  this.leadId = `LEAD-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  next();
});

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;