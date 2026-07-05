import express from "express";
import { verifyToken, adminOnly } from "../utils/verifyUser.js";
import {
  listIncomeByAssociate,
  listIncomeByClient,
  listIncomeByWork,
  getPayoutDetail,
  markPayoutPaid,
  associateIncomeSummary,
} from "../controller/payout.controller.js";

const router = express.Router();

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get("/admin/associates",                              verifyToken, adminOnly, listIncomeByAssociate);
router.get("/admin/associates/:associateId/clients",         verifyToken, adminOnly, listIncomeByClient);
router.get("/admin/associates/:associateId/works",           verifyToken, adminOnly, listIncomeByWork);
router.get("/admin/invoice/:invoiceId/payout",              verifyToken, adminOnly, getPayoutDetail);
router.patch("/admin/payout/:payoutId/mark-paid",           verifyToken, adminOnly, markPayoutPaid);

// ── Associate routes ─────────────────────────────────────────────────────────
// Associates query their own data — uses same listIncomeByWork, access checked inside
router.get("/associate/summary",                             verifyToken, associateIncomeSummary);
router.get("/associate/associates/:associateId/works",       verifyToken, listIncomeByWork);

export default router;