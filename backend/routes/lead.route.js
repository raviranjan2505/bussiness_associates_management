import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  listLeads,
  getLead,
  viewLead,
  updateLeadStatus,
  createLeadQuotation,
  createLeadInvoice,
  createLeadPayment,
} from "../controller/lead.controller.js";

const router = express.Router();

router.get("/", verifyToken, listLeads);
router.get("/:id", verifyToken, getLead);
router.put("/:id/view", verifyToken, adminOnly, viewLead);
router.put("/:id/status", verifyToken, adminOnly, updateLeadStatus);
router.post("/:id/quotation", verifyToken, adminOnly, createLeadQuotation);
router.post("/:id/invoice", verifyToken, adminOnly, createLeadInvoice);
router.post("/:id/payment", verifyToken, adminOnly, createLeadPayment);

export default router;
