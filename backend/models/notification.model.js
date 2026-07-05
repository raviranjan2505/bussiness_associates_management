import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        // Existing work submission notifications
        "Work Submitted",
        "Status Updated",
        "Documents Requested",
        "Documents Uploaded",
        "Work Completed",
        "Work Rejected",
        // Lead workflow notifications
        "Lead Submitted",
        "Quotation Created",
        "Payment Recorded",
        // Module 10: Notification System additions
        "Quotation Sent",
        "Quotation Accepted",
        "Quotation Rejected",
        "Invoice Generated",
        "Payment Updated",
        "Work Started",
        "Work Status Changed",
        "Complaint Created",
        "Complaint Replied",
        "Complaint Resolved",
        // Already emitted by invoice.controller.js but was missing from this
        // enum, which caused Notification.create() to fail validation.
        "Invoice Cancelled",
      ],
      required: true,
    },
    // Was already being passed by lead.controller.js's notify() calls but had
    // no matching schema field, so it was silently dropped — this is what
    // makes "Lead Submitted" / lead-related notifications clickable.
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    workSubmission: { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission" },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;