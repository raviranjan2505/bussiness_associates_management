import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  listInvoices,
  getInvoice,
  downloadInvoicePdf,
  updateInvoice,
} from "../controller/invoice.controller.js";

const router = express.Router();

router.get("/", verifyToken, listInvoices);
router.get("/:id", verifyToken, getInvoice);
router.get("/:id/pdf", verifyToken, downloadInvoicePdf);
router.put("/:id", verifyToken, adminOnly, updateInvoice);

export default router;
