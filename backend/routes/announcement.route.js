import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controller/announcement.controller.js";

const router = express.Router();

// Public routes (for all authenticated users)
router.get("/", verifyToken, listAnnouncements);
router.get("/:id", verifyToken, getAnnouncement);

// Admin only routes
router.post("/", verifyToken, adminOnly, createAnnouncement);
router.put("/:id", verifyToken, adminOnly, updateAnnouncement);
router.delete("/:id", verifyToken, adminOnly, deleteAnnouncement);

export default router;
