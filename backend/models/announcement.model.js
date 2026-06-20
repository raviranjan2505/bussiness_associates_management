import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ expiryDate: 1 });

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
