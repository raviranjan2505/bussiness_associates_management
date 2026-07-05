import express from "express";
import {
  submitKyc,
  getMyKyc,
  listKycRequests,
  getKycDetail,
  approveKyc,
  rejectKyc,
  deleteAssociate,
} from "../controller/kyc.controller.js";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import upload from "../utils/multer.js";

const router = express.Router();

const kycUpload = upload.fields([
  { name: "aadhaarCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
  { name: "bankProof", maxCount: 1 },
]);

// Associate
router.post("/submit", verifyToken, kycUpload, submitKyc);
router.get("/me", verifyToken, getMyKyc);

// Admin
router.get("/requests", verifyToken, adminOnly, listKycRequests);
router.get("/:userId", verifyToken, adminOnly, getKycDetail);
router.post("/:userId/approve", verifyToken, adminOnly, approveKyc);
router.post("/:userId/reject", verifyToken, adminOnly, rejectKyc);
router.delete("/associate/:userId", verifyToken, adminOnly, deleteAssociate);

export default router;