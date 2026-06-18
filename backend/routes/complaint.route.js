import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import upload from "../utils/multer.js";
import {
  createComplaint,
  listComplaints,
  getComplaint,
  updateComplaint,
  addReply,
} from "../controller/complaint.controller.js";

const router = express.Router();

router.get("/", verifyToken, listComplaints);
router.post("/", verifyToken, upload.array("attachments", 5), createComplaint);
router.get("/:id", verifyToken, getComplaint);
router.patch("/:id", verifyToken, adminOnly, updateComplaint);
router.post("/:id/reply", verifyToken, upload.array("attachments", 5), addReply);

export default router;
