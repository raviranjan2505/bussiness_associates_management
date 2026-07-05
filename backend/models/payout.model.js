import mongoose from "mongoose";

export const PAYOUT_STATUSES = ["Pending", "Paid"];

const payoutSchema = new mongoose.Schema(
  {
    associate:   { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    work:        { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission", index: true },
    invoice:     { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    payment:     { type: mongoose.Schema.Types.ObjectId, ref: "Payment", index: true },
    clientName:  { type: String, trim: true },
    payoutAmount:{ type: Number, required: true, min: 0 },
    status:      { type: String, enum: PAYOUT_STATUSES, default: "Pending", index: true },
    paidAt:      { type: Date },
    transactionRef: { type: String, trim: true },
    remarks:     { type: String, trim: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

payoutSchema.index({ associate: 1, status: 1 });
payoutSchema.index({ invoice: 1 }, { unique: true }); // one payout record per invoice

const Payout = mongoose.model("Payout", payoutSchema);
export default Payout;