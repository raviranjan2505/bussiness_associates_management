import mongoose from "mongoose";

// Singleton document — there is only ever one PaymentSettings record (the
// admin's own payment collection details, shown to every associate). Reused
// the same simple upsert-by-fixed-key pattern rather than introducing a
// separate "settings" concept.
const paymentSettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "payment_settings", unique: true, index: true },
    bankName: { type: String, trim: true, default: "" },
    accountHolderName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, default: "" },
    upiId: { type: String, trim: true, default: "" },
    qrCodeUrl: { type: String, trim: true, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const PaymentSettings = mongoose.model("PaymentSettings", paymentSettingsSchema);
export default PaymentSettings;
