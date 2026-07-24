import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import { getPaymentSettings, updatePaymentSettings } from "../controller/payment.controller.js";
import upload from "../utils/multer.js";

const router = express.Router();

// Associates need to read this (shown on every Work Details page), so this
// is intentionally NOT adminOnly — only the write below is.
router.get("/", verifyToken, getPaymentSettings);
router.put("/", verifyToken, adminOnly, upload.single("qrCode"), updatePaymentSettings);

export default router;
