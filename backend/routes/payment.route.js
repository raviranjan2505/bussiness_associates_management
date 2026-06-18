import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  addPayment,
  listPayments,
  verifyPayment,
  failPayment,
  markInvoicePaid,
  downloadReceipt,
} from "../controller/payment.controller.js";

const router = express.Router();

router.get("/", verifyToken, listPayments);
router.post("/", verifyToken, adminOnly, addPayment);
router.patch("/:id/verify", verifyToken, adminOnly, verifyPayment);
router.patch("/:id/fail", verifyToken, adminOnly, failPayment);
router.patch("/invoice/:invoiceId/mark-paid", verifyToken, adminOnly, markInvoicePaid);
router.get("/:id/receipt", verifyToken, downloadReceipt);

export default router;
