import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  listInvoices,
  getInvoice,
  downloadInvoicePdf,
  updateProjectStatus,
  getProjectTimeline,
} from "../controller/invoice.controller.js";

const router = express.Router();

router.get("/", verifyToken, listInvoices);
router.get("/:id", verifyToken, getInvoice);
router.get("/:id/pdf", verifyToken, downloadInvoicePdf);
router.post("/:id/project-status", verifyToken, adminOnly, updateProjectStatus);
router.get("/:id/timeline", verifyToken, getProjectTimeline);

export default router;
