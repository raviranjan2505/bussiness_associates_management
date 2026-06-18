import mongoose from "mongoose";

export const PAYMENT_STATUSES = ["Pending", "Verified", "Failed"];
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

const paymentSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
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
