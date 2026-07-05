import mongoose from "mongoose";

const kycDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    url: { type: String, trim: true },
    mimeType: { type: String, trim: true },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    // Personal Details
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Identity Details
    aadhaarNumber: { type: String, required: true, trim: true },
    panNumber: { type: String, required: true, trim: true, uppercase: true },

    // Bank Details
    bankDetails: {
      accountHolderName: { type: String, required: true, trim: true },
      bankName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      ifscCode: { type: String, required: true, trim: true, uppercase: true },
      upiId: { type: String, trim: true },
    },

    // Document Uploads
    documents: {
      aadhaarCard: kycDocumentSchema,
      panCard: kycDocumentSchema,
      bankProof: kycDocumentSchema,
    },

    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
    rejectionReason: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Kyc = mongoose.model("Kyc", kycSchema);
export default Kyc;