import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true, trim: true, index: true },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: "Mobile number must be exactly 10 digits",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email address",
      },
    },
    address: { type: String, trim: true },
    clientType: {
      type: String,
      enum: ["Individual", "Business"],
      default: "Individual",
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: (v) => /^[0-9]{12}$/.test(v),
        message: "Aadhaar number must be exactly 12 digits",
      },
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
        message: "Invalid PAN number format (e.g. ABCDE1234F)",
      },
    },
  },
  { timestamps: true }
);

// Unique mobile per associate — one associate cannot have two clients with the same mobile
clientSchema.index({ associate: 1, mobileNumber: 1 }, { unique: true });
clientSchema.index({ associate: 1, clientName: 1, email: 1, address: 1 });
clientSchema.index({ pan: 1 }, { sparse: true });

const Client = mongoose.model("Client", clientSchema);

export default Client;