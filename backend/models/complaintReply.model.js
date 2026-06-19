import mongoose from "mongoose";

const replyAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: true }
);

const complaintReplySchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    message: { type: String, required: true, trim: true },
    attachments: { type: [replyAttachmentSchema], default: [] },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["admin", "associate"], required: true },
  },
  { timestamps: true }
);

complaintReplySchema.index({ complaint: 1, createdAt: 1 });

const ComplaintReply = mongoose.model("ComplaintReply", complaintReplySchema);
export default ComplaintReply;
