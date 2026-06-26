import mongoose from "mongoose";

export const QUOTATION_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"];

const quotationServiceSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    associateEarningPercent: { type: Number, default: 0, min: 0, max: 100 },
    associateEarningAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true, index: true },

    // "associateId" from the spec -> stored as a User reference, consistent with
    // how WorkSubmission references the submitting associate.
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    leadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true }],
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },

    customerName: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    services: {
      type: [quotationServiceSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one service is required",
      },
    },

    subtotal: { type: Number, required: true, min: 0, default: 0 },

    discount: {
      type: {
        type: String,
        enum: ["flat", "percentage"],
        default: "flat",
      },
      value: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 },
    },

    tax: {
      percent: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 },
    },

    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    associateEarningAmount: { type: Number, default: 0, min: 0 },

    notes: { type: String, trim: true },
    terms: { type: String, trim: true },

    status: { type: String, enum: QUOTATION_STATUSES, default: "Draft", index: true },

    rejectionReason: { type: String, trim: true },

    validUntil: { type: Date },
    sentAt: { type: Date },
    respondedAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ associate: 1, status: 1 });
quotationSchema.index({ quotationNumber: "text", customerName: "text" });

quotationSchema.pre("validate", function (next) {
  // Keep totals consistent whenever a quotation is created or saved directly
  const subtotal = (this.services || []).reduce((sum, item) => {
    const amount = item.amount ?? (item.price || 0) * (item.quantity ?? 1);
    item.amount = Number(amount.toFixed(2));
    return sum + item.amount;
  }, 0);

  this.subtotal = Number(subtotal.toFixed(2));

  const discountValue = this.discount?.value || 0;
  const discountAmount =
    this.discount?.type === "percentage" ? (this.subtotal * discountValue) / 100 : discountValue;
  this.discount.amount = Number(discountAmount.toFixed(2));

  const taxableAmount = Math.max(this.subtotal - this.discount.amount, 0);
  const taxPercent = this.tax?.percent || 0;
  this.tax.amount = Number(((taxableAmount * taxPercent) / 100).toFixed(2));

  this.totalAmount = Number((taxableAmount + this.tax.amount).toFixed(2));
  this.associateEarningAmount = Number(
    (this.services || []).reduce((sum, item) => sum + (Number(item.associateEarningAmount) || 0), 0).toFixed(2)
  );

  next();
});

const Quotation = mongoose.model("Quotation", quotationSchema);
export default Quotation;
