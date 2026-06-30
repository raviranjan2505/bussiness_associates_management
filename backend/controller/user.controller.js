import User from "../models/user.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import Lead from "../models/lead.model.js";
import { errorHandler } from "../utils/error.js";

// Get all associates (admin only)
export const getUsers = async (req, res, next) => {
  try {
    const associates = await User.find({ role: "associate" }).select("-password").sort({ createdAt: -1 });
    const associateIds = associates.map((a) => a._id);

    // Single aggregation each — avoids N+1 queries (one per associate)
    const [incomeAgg, leadsAgg, worksAgg] = await Promise.all([
      WorkSubmission.aggregate([
        { $match: { status: "Completed", associate: { $in: associateIds } } },
        { $group: { _id: "$associate", totalIncome: { $sum: "$associateEarningAmount" } } },
      ]),
      Lead.aggregate([
        { $match: { associate: { $in: associateIds } } },
        { $group: { _id: "$associate", count: { $sum: 1 } } },
      ]),
      WorkSubmission.aggregate([
        { $match: { associate: { $in: associateIds } } },
        { $group: { _id: "$associate", count: { $sum: 1 } } },
      ]),
    ]);

    const incomeMap = new Map(incomeAgg.map((r) => [String(r._id), r.totalIncome]));
    const leadsMap = new Map(leadsAgg.map((r) => [String(r._id), r.count]));
    const worksMap = new Map(worksAgg.map((r) => [String(r._id), r.count]));

    const associatesWithCounts = associates.map((associate) => ({
      ...associate._doc,
      totalIncome: incomeMap.get(String(associate._id)) || 0,
      leadsCount: leadsMap.get(String(associate._id)) || 0,
      worksCount: worksMap.get(String(associate._id)) || 0,
    }));

    res.status(200).json(associatesWithCounts);
  } catch (err) { next(err); }
};

// Get single user by ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return next(errorHandler(404, "User not found"));
    res.status(200).json(user);
  } catch (err) { next(err); }
};