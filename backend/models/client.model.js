import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true, trim: true, index: true },
    mobileNumber: { type: String, trim: true, index: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

clientSchema.index({ associate: 1, clientName: 1, mobileNumber: 1, email: 1, address: 1 });

const Client = mongoose.model("Client", clientSchema);
export default Client;
