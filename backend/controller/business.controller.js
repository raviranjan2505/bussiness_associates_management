import mongoose from "mongoose";
import Division from "../models/division.model.js";
import Service from "../models/service.model.js";
import User from "../models/user.model.js";
import WorkSubmission, { WORK_STATUSES } from "../models/workSubmission.model.js";
import Notification from "../models/notification.model.js";
import { errorHandler } from "../utils/error.js";

const associateRoles = ["associate"];
const SERVICE_EARNING_PERCENT = 20;

const toFileUrl = (req, file) => `${req.protocol}://${req.get("host")}/uploads/documents/${file.filename}`;

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const buildServicePricing = (body, existingService = null) => {
  const rawPrice = body.price;
  const normalizedPriceSource =
    rawPrice !== undefined && rawPrice !== null && rawPrice !== ""
      ? rawPrice
      : existingService?.price;
  const price = Number(normalizedPriceSource);
  if (!Number.isFinite(price) || price < 0) {
    throw errorHandler(400, "A valid service price is required");
  }

  const associateEarningPercent = SERVICE_EARNING_PERCENT;
  const associateEarningAmount = toMoney((price * associateEarningPercent) / 100);

  return {
    price,
    associateEarningPercent,
    associateEarningAmount,
  };
};

const addAudit = (work, actionType, description, user) => {
  work.auditLogs.push({
    actionType,
    description,
    user: user.id,
    userName: user.name,
    userRole: user.role,
  });
};

const notify = async ({ user, title, message, type, workSubmission }) => {
  if (!user) return;
  await Notification.create({ user, title, message, type, workSubmission });
};

const notifyAdmins = async ({ title, message, type, workSubmission }) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  await Notification.insertMany(
    admins.map((admin) => ({ user: admin._id, title, message, type, workSubmission }))
  );
};

const ensureWorkAccess = (work, user) => {
  if (user.role === "admin") return true;
  return String(work.associate?._id || work.associate) === user.id;
};

export const listDivisions = async (req, res, next) => {
  try {
    const filter = req.user?.role === "admin" ? {} : { isActive: true };
    const divisions = await Division.find(filter).sort({ name: 1 });
    res.status(200).json({ divisions });
  } catch (error) {
    next(error);
  }
};

export const createDivision = async (req, res, next) => {
  try {
    const division = await Division.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ message: "Division created", division });
  } catch (error) {
    next(error);
  }
};

export const updateDivision = async (req, res, next) => {
  try {
    const division = await Division.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!division) return next(errorHandler(404, "Division not found"));
    res.status(200).json({ message: "Division updated", division });
  } catch (error) {
    next(error);
  }
};

export const deleteDivision = async (req, res, next) => {
  try {
    const serviceCount = await Service.countDocuments({ division: req.params.id });
    if (serviceCount > 0) return next(errorHandler(400, "Division has services. Disable it instead or remove services first."));
    const division = await Division.findByIdAndDelete(req.params.id);
    if (!division) return next(errorHandler(404, "Division not found"));
    res.status(200).json({ message: "Division deleted" });
  } catch (error) {
    next(error);
  }
};

export const listServices = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.division) filter.division = req.query.division;
    if (req.user?.role !== "admin") filter.isActive = true;
    const services = await Service.find(filter).populate("division", "name").sort({ name: 1 });
    res.status(200).json({ services });
  } catch (error) {
    next(error);
  }
};

export const getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate("division", "name");
    if (!service) return next(errorHandler(404, "Service not found"));
    res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  try {
    const pricing = buildServicePricing(req.body);
    const service = await Service.create({ ...req.body, ...pricing, createdBy: req.user.id });
    res.status(201).json({ message: "Service created", service });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const existingService = await Service.findById(req.params.id);
    if (!existingService) return next(errorHandler(404, "Service not found"));
    const pricing = buildServicePricing(req.body, existingService);
    const service = await Service.findByIdAndUpdate(req.params.id, { ...req.body, ...pricing }, { new: true, runValidators: true });
    if (!service) return next(errorHandler(404, "Service not found"));
    res.status(200).json({ message: "Service updated", service });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const usedCount = await WorkSubmission.countDocuments({ service: req.params.id });
    if (usedCount > 0) {
      const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      return res.status(200).json({ message: "Service has submissions and was disabled", service });
    }
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return next(errorHandler(404, "Service not found"));
    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    next(error);
  }
};

export const submitWork = async (req, res, next) => {
  try {
    const { division, service, formData, clientDetails } = req.body;
    const parsedClient = typeof clientDetails === "string" ? JSON.parse(clientDetails) : clientDetails;
    const parsedForm = typeof formData === "string" ? JSON.parse(formData || "{}") : formData || {};

    if (!division || !service || !parsedClient?.clientName) {
      return next(errorHandler(400, "Division, service and client name are required"));
    }

    const serviceDoc = await Service.findById(service);
    if (!serviceDoc) return next(errorHandler(404, "Service not found"));
    if (serviceDoc.price == null) return next(errorHandler(400, "Service price is not configured"));

    for (const field of serviceDoc.fields || []) {
      if (field.required && !parsedForm[field.name]) {
        return next(errorHandler(400, `${field.label} is required`));
      }
    }

    const documents = (req.files || []).map((file) => ({
      name: file.originalname,
      category: req.body.documentCategory || "Initial Submission",
      url: toFileUrl(req, file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user.id,
    }));

    const work = new WorkSubmission({
      associate: req.user.id,
      division,
      service,
      servicePrice: serviceDoc.price,
      associateEarningPercent: serviceDoc.associateEarningPercent ?? SERVICE_EARNING_PERCENT,
      associateEarningAmount: serviceDoc.associateEarningAmount ?? toMoney((serviceDoc.price * SERVICE_EARNING_PERCENT) / 100),
      clientDetails: parsedClient,
      formData: parsedForm,
      documents,
      status: "Pending",
    });

    work.statusHistory.push({
      newStatus: "Pending",
      reason: "Work Submitted",
      remark: "Submission received from associate",
      updatedBy: req.user.id,
    });
    addAudit(work, "Work Created", "Associate submitted a new work request", req.user);
    if (documents.length) addAudit(work, "Document Uploaded", `${documents.length} document(s) uploaded`, req.user);
    await work.save();

    await notifyAdmins({
      title: "New work submitted",
      message: `${parsedClient.clientName} was submitted for review`,
      type: "Work Submitted",
      workSubmission: work._id,
    });

    res.status(201).json({ message: "Work submitted", work });
  } catch (error) {
    next(error);
  }
};

export const listWorks = async (req, res, next) => {
  try {
    const {
      status,
      division,
      service,
      associate,
      search,
      from,
      to,
      completionFrom,
      completionTo,
    } = req.query;
    const filter = {};
    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (status) filter.status = status;
    if (division) filter.division = division;
    if (service) filter.service = service;
    if (associate && req.user.role === "admin") filter.associate = associate;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    if (completionFrom || completionTo) filter.completedAt = {};
    if (completionFrom) filter.completedAt.$gte = new Date(completionFrom);
    if (completionTo) filter.completedAt.$lte = new Date(completionTo);
    if (search) {
      filter.$or = [
        { workId: new RegExp(search, "i") },
        { "clientDetails.clientName": new RegExp(search, "i") },
        { "clientDetails.mobileNumber": new RegExp(search, "i") },
      ];
    }

    const works = await WorkSubmission.find(filter)
      .populate("associate", "name email profileImageUrl")
      .populate("assignedAdmin", "name email")
      .populate("division", "name")
      .populate("service", "name price associateEarningPercent associateEarningAmount")
      .sort({ createdAt: -1 });

    res.status(200).json({ works });
  } catch (error) {
    next(error);
  }
};

export const getWork = async (req, res, next) => {
  try {
    const work = await WorkSubmission.findById(req.params.id)
      .populate("associate", "name email profileImageUrl")
      .populate("assignedAdmin", "name email")
      .populate("division", "name")
      .populate("service", "name price associateEarningPercent associateEarningAmount fields requiredDocuments")
      .populate("statusHistory.updatedBy", "name role")
      .populate("auditLogs.user", "name role");
    if (!work) return next(errorHandler(404, "Work not found"));
    if (!ensureWorkAccess(work, req.user)) return next(errorHandler(403, "Access denied"));
    res.status(200).json(work);
  } catch (error) {
    next(error);
  }
};

export const updateWorkStatus = async (req, res, next) => {
  try {
    const { status, reason, remark, internalNote, requestedDocuments, expectedCompletionDate, assignedAdmin } = req.body;
    if (!WORK_STATUSES.includes(status)) return next(errorHandler(400, "Invalid status"));
    const parsedRequestedDocuments =
      Array.isArray(requestedDocuments)
        ? requestedDocuments
        : typeof requestedDocuments === "string"
          ? JSON.parse(requestedDocuments || "[]")
          : [];

    const work = await WorkSubmission.findById(req.params.id);
    if (!work) return next(errorHandler(404, "Work not found"));
    const completedDocuments = (req.files || []).map((file) => ({
      name: file.originalname,
      category: "Completed Document",
      url: toFileUrl(req, file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user.id,
      requestLabel: "Completed Documents",
    }));
    if (status !== "Completed" && completedDocuments.length > 0) {
      return next(errorHandler(400, "Completed documents can only be attached when the work is marked Completed"));
    }
    const previousStatus = work.status;
    work.status = status;
    work.expectedCompletionDate = expectedCompletionDate || work.expectedCompletionDate;
    work.assignedAdmin = assignedAdmin || req.user.id;
    if (status === "Completed") work.completedAt = new Date();

    work.statusHistory.push({
      previousStatus,
      newStatus: status,
      reason,
      remark,
      internalNote,
      requestedDocuments: parsedRequestedDocuments,
      updatedBy: req.user.id,
    });
    addAudit(work, "Status Changed", `Status changed from ${previousStatus} to ${status}`, req.user);
    if (remark) addAudit(work, "Remarks Added", remark, req.user);
    if (status === "Documents Required") addAudit(work, "Document Request Raised", parsedRequestedDocuments.join(", ") || "Additional documents requested", req.user);
    if (completedDocuments.length) {
      work.documents.push(...completedDocuments);
      addAudit(work, "Completed Documents Uploaded", `${completedDocuments.length} completed document(s) uploaded`, req.user);
    }
    await work.save();

    await notify({
      user: work.associate,
      title: `Work ${status}`,
      message: remark || reason || `Your work status changed to ${status}`,
      type: status === "Documents Required" ? "Documents Requested" : status === "Completed" ? "Work Completed" : status === "Rejected" ? "Work Rejected" : "Status Updated",
      workSubmission: work._id,
    });

    res.status(200).json({ message: "Status updated", work });
  } catch (error) {
    next(error);
  }
};

export const uploadAdditionalDocuments = async (req, res, next) => {
  try {
    const work = await WorkSubmission.findById(req.params.id);
    if (!work) return next(errorHandler(404, "Work not found"));
    if (!ensureWorkAccess(work, req.user) || req.user.role === "admin") return next(errorHandler(403, "Associates can upload documents only to their own work"));
    if (!req.files?.length) return next(errorHandler(400, "At least one document is required"));

    const existingVersions = work.documents.reduce((map, doc) => {
      map[doc.originalName || doc.name] = Math.max(map[doc.originalName || doc.name] || 0, doc.version || 1);
      return map;
    }, {});
    const docs = req.files.map((file) => ({
      name: file.originalname,
      category: "Additional Document",
      url: toFileUrl(req, file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      version: (existingVersions[file.originalname] || 0) + 1,
      uploadedBy: req.user.id,
      requestLabel: req.body.requestLabel,
    }));
    work.documents.push(...docs);
    addAudit(work, "Additional Document Uploaded", `${docs.length} additional document(s) uploaded`, req.user);
    await work.save();

    await notifyAdmins({
      title: "Documents uploaded",
      message: `${docs.length} additional document(s) uploaded for ${work.workId}`,
      type: "Documents Uploaded",
      workSubmission: work._id,
    });

    res.status(200).json({ message: "Documents uploaded", work });
  } catch (error) {
    next(error);
  }
};

export const adminDashboard = async (req, res, next) => {
  try {
    const statusCounts = await WorkSubmission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const incomeResult = await WorkSubmission.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: "$associateEarn
            
            
            ingAmount",
          },
        },
      },
    ]);

    const totalIncome =
      incomeResult.length > 0
        ? incomeResult[0].totalIncome
        : 0;

    const byDivision = await WorkSubmission.aggregate([
      { $group: { _id: "$division", count: { $sum: 1 } } },
      { $lookup: { from: "divisions", localField: "_id", foreignField: "_id", as: "division" } },
      { $unwind: "$division" },
      { $project: { name: "$division.name", count: 1 } },
    ]);
    const byService = await WorkSubmission.aggregate([
      { $group: { _id: "$service", count: { $sum: 1 } } },
      { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: "$service" },
      { $project: { name: "$service.name", count: 1 } },
    ]);
    const totalAssociates = await User.countDocuments({ role: { $in: associateRoles } });
    const recentWorks = await WorkSubmission.find()
      .populate("associate", "name")
      .populate("division", "name")
      .populate("service", "name")
      .sort({ updatedAt: -1 })
      .limit(10);

    const statistics = {
      totalAssociates,
      totalWorkRequests: await WorkSubmission.countDocuments(),
      totalIncome,
      Pending: 0,
      "Under Review": 0,
      "Documents Required": 0,
      "In Process": 0,
      Completed: 0,
      Rejected: 0,
    };
    statusCounts.forEach((item) => {
      statistics[item._id] = item.count;
    });

    res.status(200).json({ statistics, byDivision, byService, recentWorks });
  } catch (error) {
    next(error);
  }
};

export const associateDashboard = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const statusCounts = await WorkSubmission.aggregate([
      { $match: { associate: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
        // Total Income of Current Associate
    const incomeResult = await WorkSubmission.aggregate([
      {
        $match: {
          associate: userId,
          status: "Completed", // sirf completed works ki earning
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: "$associateEarningAmount",
          },
        },
      },
    ]);

    const totalIncome =
      incomeResult.length > 0
        ? incomeResult[0].totalIncome
        : 0;

    const statistics = {
      mySubmittedWork: await WorkSubmission.countDocuments({ associate: req.user.id }),
      totalIncome,
      Pending: 0,
      "In Process": 0,
      Completed: 0,
      Rejected: 0,
      requestedDocuments: 0,
    };
    statusCounts.forEach((item) => {
      if (item._id === "Documents Required") statistics.requestedDocuments = item.count;
      statistics[item._id] = item.count;
    });
    const recentWorks = await WorkSubmission.find({ associate: req.user.id })
      .populate("division", "name")
      .populate("service", "name")
      .sort({ updatedAt: -1 })
      .limit(10);
    res.status(200).json({ statistics, recentWorks });
  } catch (error) {
    next(error);
  }
};

export const listNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true });
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};
