import User from "../models/user.model.js";
import Invoice from "../models/invoice.model.js";
import { errorHandler } from "../utils/error.js";

// Get all associates (admin only)
export const getUsers = async (req, res, next) => {
  try {
    const associates = await User.find({ role: "associate" }).select("-password").sort({ createdAt: -1 });
    
    // Get total income for each associate
    const associatesWithIncome = await Promise.all(
      associates.map(async (associate) => {
        const incomeResult = await Invoice.aggregate([
          { $match: { associate: associate._id } },
          { $group: { _id: null, totalIncome: { $sum: "$amountPaid" } } },
        ]);
        
        const totalIncome = incomeResult.length > 0 ? incomeResult[0].totalIncome : 0;
        
        return {
          ...associate._doc,
          totalIncome,
        };
      })
    );
    
    res.status(200).json(associatesWithIncome);
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
