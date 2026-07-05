// Shared "Total Commission" calculation.
//
// Total Commission = sum of associateEarningAmount for WorkSubmissions whose
// status is "Completed". This is the single source of truth used by:
//   - Admin Dashboard  (business.controller.js -> adminDashboard)
//   - Associate Dashboard (business.controller.js -> associateDashboard)
//   - Admin Income page (payout.controller.js -> listIncomeByAssociate)
//   - Associate Income page (payout.controller.js -> associateIncomeSummary)
//
// Keeping the calculation in one place guarantees the number shown is always
// identical across every page, and that it only ever reflects completed work.
import WorkSubmission from "../models/workSubmission.model.js";

/**
 * Total commission earned (all associates, or a single associate) from
 * completed work only.
 * @param {import("mongoose").Types.ObjectId|string} [associateId] - optional, scopes to one associate
 * @returns {Promise<number>}
 */
export const getTotalCommission = async (associateId) => {
  const match = { status: "Completed" };
  if (associateId) match.associate = associateId;

  const result = await WorkSubmission.aggregate([
    { $match: match },
    { $group: { _id: null, totalCommission: { $sum: "$associateEarningAmount" } } },
  ]);

  return result.length > 0 ? result[0].totalCommission || 0 : 0;
};

/**
 * Total commission earned from completed work, grouped by associate.
 * Returns a Map keyed by associate id (string) -> commission amount.
 * @returns {Promise<Map<string, number>>}
 */
export const getCommissionByAssociate = async () => {
  const rows = await WorkSubmission.aggregate([
    { $match: { status: "Completed" } },
    { $group: { _id: "$associate", totalCommission: { $sum: "$associateEarningAmount" } } },
  ]);

  return new Map(rows.map((r) => [String(r._id), r.totalCommission || 0]));
};

/**
 * Total commission earned from completed work for one associate, grouped by
 * client name (matches WorkSubmission.clientDetails.clientName).
 * Returns a Map keyed by client name -> commission amount.
 * @param {import("mongoose").Types.ObjectId|string} associateId
 * @returns {Promise<Map<string, number>>}
 */
export const getCommissionByClient = async (associateId) => {
  const rows = await WorkSubmission.aggregate([
    { $match: { associate: associateId, status: "Completed" } },
    { $group: { _id: "$clientDetails.clientName", totalCommission: { $sum: "$associateEarningAmount" } } },
  ]);

  return new Map(rows.map((r) => [r._id, r.totalCommission || 0]));
};

export default getTotalCommission;
