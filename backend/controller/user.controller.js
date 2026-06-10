import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

// Get all associates (admin only)
export const getUsers = async (req, res, next) => {
  try {
    const associates = await User.find({ role: "associate" }).select("-password").sort({ createdAt: -1 });
    res.status(200).json(associates);
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
