import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  createQuotation,
  listQuotations,
  getQuotationsSummary,
  getQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  downloadQuotationPdf,
  downloadClientQuotationPdf,
  sendQuotationToClient,
} from "../controller/quotation.controller.js";

const router = express.Router();

router.get("/", verifyToken, listQuotations);
router.post("/", verifyToken, createQuotation);
router.get("/summary", verifyToken, getQuotationsSummary);
router.get("/:id", verifyToken, getQuotation);
router.put("/:id", verifyToken, adminOnly, updateQuotation);
router.delete("/:id", verifyToken, deleteQuotation);
router.get("/:id/pdf", verifyToken, downloadQuotationPdf);
router.get("/:id/pdf/client", verifyToken, downloadClientQuotationPdf);
router.post("/:id/send", verifyToken, adminOnly, sendQuotation);
router.post("/:id/send-to-client", verifyToken, sendQuotationToClient);
router.post("/:id/accept", verifyToken, acceptQuotation);
router.post("/:id/reject", verifyToken, rejectQuotation);

export default router;