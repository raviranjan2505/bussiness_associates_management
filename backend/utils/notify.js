import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

// Send a notification to a single user
export const notify = async ({
  user,
  title,
  message,
  type,
  workSubmission,
  quotation,
  invoice,
  payment,
  complaint,
}) => {
  if (!user) return;
  await Notification.create({
    user,
    title,
    message,
    type,
    workSubmission,
    quotation,
    invoice,
    payment,
    complaint,
  });
};

// Send a notification to every admin user
export const notifyAdmins = async ({
  title,
  message,
  type,
  workSubmission,
  quotation,
  invoice,
  payment,
  complaint,
}) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  if (!admins.length) return;
  await Notification.insertMany(
    admins.map((admin) => ({
      user: admin._id,
      title,
      message,
      type,
      workSubmission,
      quotation,
      invoice,
      payment,
      complaint,
    }))
  );
};
