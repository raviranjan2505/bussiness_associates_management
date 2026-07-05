import mongoose from "mongoose";

const formFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["text", "email", "tel", "number", "textarea", "date", "select", "checkbox"],
      default: "text",
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
    placeholder: { type: String, trim: true },
    validation: {
      pattern: String,
      minLength: Number,
      maxLength: Number,
    },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const requiredDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
  },
  { _id: true }
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division", required: true },
    price: { type: Number, required: true, min: 0 },
    // Commission configuration (admin-controlled) ---------------------------
    // - "Percentage"  -> commissionValue is a % of the service price
    // - "Fixed Amount"-> commissionValue is a flat rupee amount
    // - "Loan Based"  -> service price stays ₹0; commissionValue is a % that
    //                    gets applied to the Loan Amount entered on the work
    commissionType: {
      type: String,
      enum: ["Fixed Amount", "Percentage", "Loan Based"],
      default: "Percentage",
    },
    commissionValue: { type: Number, default: 20, min: 0 },
    associateEarningPercent: { type: Number, default: 20, min: 0, max: 100 },
    associateEarningAmount: { type: Number, required: true, min: 0 },
    fields: [formFieldSchema],
    requiredDocuments: [requiredDocumentSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

serviceSchema.index({ division: 1, name: 1 }, { unique: true });
serviceSchema.index({ isActive: 1 });

const Service = mongoose.model("Service", serviceSchema);
export default Service;