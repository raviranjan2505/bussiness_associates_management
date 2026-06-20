import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    associate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true, trim: true, index: true },
    mobileNumber: { type: String, trim: true, index: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    pan: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ associate: 1, clientName: 1, mobileNumber: 1, email: 1, address: 1 });
clientSchema.index({ pan: 1 }, { sparse: true });

const Client = mongoose.model("Client", clientSchema);

// Sync indexes - this will drop old indexes and create new ones
if (process.env.NODE_ENV !== "test") {
  Client.syncIndexes().catch(() => {
    // Continue even if sync fails - the app will still work
  });
}

export default Client;
