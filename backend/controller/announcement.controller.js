import Announcement from "../models/announcement.model.js";
import { errorHandler } from "../utils/error.js";

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, description, content, priority, expiryDate } = req.body;

    if (!title || !description) {
      return next(errorHandler(400, "Title and description are required"));
    }

    const announcement = new Announcement({
      title,
      description,
      content,
      priority: priority || "Medium",
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: req.user.id,
      isActive: true,
    });

    await announcement.save();
    await announcement.populate("createdBy", "name email");
    res.status(201).json({ message: "Announcement created", announcement });
  } catch (error) {
    next(error);
  }
};

export const listAnnouncements = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true;
    }

    // Filter out expired announcements
    filter.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } },
    ];

    const announcements = await Announcement.find(filter)
      .populate("createdBy", "name email")
      .sort({ priority: -1, createdAt: -1 });

    res.status(200).json({ announcements });
  } catch (error) {
    next(error);
  }
};

export const getAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!announcement) {
      return next(errorHandler(404, "Announcement not found"));
    }

    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const { title, description, content, priority, isActive, expiryDate } =
      req.body;

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return next(errorHandler(404, "Announcement not found"));
    }

    // Only admin or creator can update
    if (
      req.user.role !== "admin" &&
      String(announcement.createdBy) !== String(req.user.id)
    ) {
      return next(errorHandler(403, "Access denied"));
    }

    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    announcement.content = content !== undefined ? content : announcement.content;
    announcement.priority = priority || announcement.priority;
    announcement.isActive =
      isActive !== undefined ? isActive : announcement.isActive;
    announcement.expiryDate = expiryDate ? new Date(expiryDate) : announcement.expiryDate;

    await announcement.save();
    await announcement.populate("createdBy", "name email");

    res.status(200).json({ message: "Announcement updated", announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return next(errorHandler(404, "Announcement not found"));
    }

    // Only admin or creator can delete
    if (
      req.user.role !== "admin" &&
      String(announcement.createdBy) !== String(req.user.id)
    ) {
      return next(errorHandler(403, "Access denied"));
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};
