import mongoose from "mongoose";

export const INVOICE_STATUSES = [
  "Generated",
  "Waiting For Payment",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
];

const invoiceServiceSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },

    quotation: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    customerName: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    services: { type: [invoiceServiceSchema], default: [] },

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

    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },

    dueDate: { type: Date },

    invoiceStatus: { type: String, enum: INVOICE_STATUSES, default: "Generated", index: true },

    notes: { type: String, trim: true },
    terms: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ associate: 1, invoiceStatus: 1 });
invoiceSchema.index({ invoiceNumber: "text", customerName: "text" });

invoiceSchema.pre("validate", function (next) {
  this.balanceDue = Number(Math.max((this.totalAmount || 0) - (this.amountPaid || 0), 0).toFixed(2));
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
