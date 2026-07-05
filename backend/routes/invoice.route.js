import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  listInvoices,
  getInvoiceSummary,
  getInvoice,
  downloadInvoicePdf,
  downloadClientInvoicePdf,
  updateInvoice,
  sendInvoiceToClient,
  cancelInvoice,
} from "../controller/invoice.controller.js";

const router = express.Router();

router.get("/", verifyToken, listInvoices);
router.get("/summary", verifyToken, getInvoiceSummary);
router.get("/:id", verifyToken, getInvoice);
router.get("/:id/pdf", verifyToken, downloadInvoicePdf);
router.get("/:id/pdf/client", verifyToken, downloadClientInvoicePdf);
router.put("/:id", verifyToken, adminOnly, updateInvoice);
router.post("/:id/send-to-client", verifyToken, sendInvoiceToClient);
router.patch("/:id/cancel", verifyToken, adminOnly, cancelInvoice);

export default router;