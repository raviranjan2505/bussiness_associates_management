import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["Work Submitted", "Status Updated", "Documents Requested", "Documents Uploaded", "Work Completed", "Work Rejected"],
      required: true,
    },
    workSubmission: { type: mongoose.Schema.Types.ObjectId, ref: "WorkSubmission" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
