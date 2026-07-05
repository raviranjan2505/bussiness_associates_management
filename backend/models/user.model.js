import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    role: { type: String, enum: ["admin", "associate"], default: "associate" },
    // KYC gating — only meaningful for associates. Admins are always
    // "Approved" (set explicitly at signup) so this never affects them.
    kycStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;