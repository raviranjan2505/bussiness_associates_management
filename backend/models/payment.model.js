import mongoose from "mongoose";

export const PAYMENT_STATUSES = ["Pending", "Verified", "Failed"];
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

const paymentSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    // Only set when the payment was submitted by the associate themselves
    // from the Work Details page (rather than recorded manually by admin) —
    // lets both sides quickly navigate back to the related work.
    work: { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission", index: true },
    // Quick-reference URL to the associate's uploaded payment proof. The
    // actual file + its metadata live in WorkSubmission.documents (via the
    // existing Additional Documents upload) — this just avoids admin having
    // to hunt through the work's documents to find it during verification.
    proofUrl: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "Bank Transfer" },
    transactionId: { type: String, trim: true },
    remarks: { type: String, trim: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: "Pending", index: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ invoice: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
