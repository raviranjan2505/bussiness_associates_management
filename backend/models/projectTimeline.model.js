import mongoose from "mongoose";
import { WORK_STATUSES } from "./invoice.model.js";

const projectTimelineSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    previousStatus: { type: String, enum: WORK_STATUSES },
    newStatus: { type: String, enum: WORK_STATUSES, required: true },
    remark: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

projectTimelineSchema.index({ invoice: 1, timestamp: -1 });

const ProjectTimeline = mongoose.model("ProjectTimeline", projectTimelineSchema);
export default ProjectTimeline;
