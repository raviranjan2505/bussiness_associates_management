import mongoose from "mongoose";
import Division from "../models/division.model.js";
import Service from "../models/service.model.js";
import Client from "../models/client.model.js";
import User from "../models/user.model.js";
import WorkSubmission, { WORK_STATUSES } from "../models/workSubmission.model.js";
import Lead from "../models/lead.model.js";
import Notification from "../models/notification.model.js";
import Quotation from "../models/quotation.model.js";
import Invoice from "../models/invoice.model.js";
import Complaint from "../models/complaint.model.js";
import { errorHandler } from "../utils/error.js";
import { toMoney } from "../utils/money.js";
import { notify, notifyAdmins } from "../utils/notify.js";

const associateRoles = ["associate"];
const SERVICE_EARNING_PERCENT = 20;

const normalizeClientPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const upsertClientRecord = async (associateId, clientInput) => {
  const existingCandidates = await Client.find({
    associate: associateId,
    clientName: new RegExp(`^${escapeRegex(clientInput.clientName || "")}$`, "i"),
  });
  const existing = existingCandidates.find((client) =>
    normalizeClientPart(client.mobileNumber) === normalizeClientPart(clientInput.mobileNumber) &&
    normalizeClientPart(client.email) === normalizeClientPart(clientInput.email) &&
    normalizeClientPart(client.address) === normalizeClientPart(clientInput.address)
  );
  if (existing) {
    existing.clientName = clientInput.clientName?.trim() || existing.clientName;
    existing.mobileNumber = clientInput.mobileNumber?.trim() || existing.mobileNumber;
    existing.email = clientInput.email?.trim() || existing.email;
    existing.address = clientInput.address?.trim() || existing.address;
    await existing.save();
    return existing;
  }

  return Client.create({
    associate: associateId,
    clientName: clientInput.clientName?.trim(),
    mobileNumber: clientInput.mobileNumber?.trim(),
    email: clientInput.email?.trim(),
    address: clientInput.address?.trim(),
  });
};

const toFileUrl = (req, file) => `${req.protocol}://${req.get("host")}/uploads/documents/${file.filename}`;

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
    const { division, service, formData, clientDetails, clientId } = req.body;

    let parsedClient = clientDetails;
    let parsedForm = formData;
    try {
      parsedClient = typeof clientDetails === "string" ? JSON.parse(clientDetails) : clientDetails;
    } catch (err) {
      return next(errorHandler(400, "Invalid client details payload"));
    }
    try {
      parsedForm = typeof formData === "string" ? JSON.parse(formData || "{}") : formData || {};
    } catch (err) {
      return next(errorHandler(400, "Invalid form data payload"));
    }

    if (!division || !service) {
      return next(errorHandler(400, "Division and service are required"));
    }

    const serviceDoc = await Service.findById(service);
    if (!serviceDoc) return next(errorHandler(404, "Service not found"));
    if (serviceDoc.price == null) return next(errorHandler(400, "Service price is not configured"));

    let clientDoc = null;
    const clientIdValue = typeof clientId === "string" ? clientId.trim() : clientId;
    if (clientIdValue) {
      if (mongoose.isValidObjectId(clientIdValue)) {
        clientDoc = await Client.findById(clientIdValue);
        if (!clientDoc) return next(errorHandler(404, "Client not found"));
        if (req.user.role !== "admin" && String(clientDoc.associate) !== req.user.id) {
          return next(errorHandler(403, "Access denied"));
        }
      } else if (!parsedClient?.clientName) {
        return next(errorHandler(400, "Invalid client identifier"));
      }
    }
    if (!clientDoc && parsedClient?.clientName) {
      clientDoc = await upsertClientRecord(req.user.id, parsedClient);
    }

    const resolvedClient = clientDoc
      ? {
          clientName: clientDoc.clientName,
          mobileNumber: clientDoc.mobileNumber,
          email: clientDoc.email,
          address: clientDoc.address,
        }
      : parsedClient;

    if (!resolvedClient?.clientName) {
      return next(errorHandler(400, "Client details are required"));
    }

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

    const lead = new Lead({
      associate: req.user.id,
      division,
      service,
      servicePrice: serviceDoc.price,
      associateEarningPercent: serviceDoc.associateEarningPercent ?? SERVICE_EARNING_PERCENT,
      associateEarningAmount: serviceDoc.associateEarningAmount ?? toMoney((serviceDoc.price * SERVICE_EARNING_PERCENT) / 100),
      clientId: clientDoc?._id,
      clientDetails: resolvedClient,
      title: req.body.title || serviceDoc.name,
      description: req.body.description || parsedForm.description || "",
      priority: req.body.priority || "Normal",
      category: req.body.category || serviceDoc.name,
      formData: parsedForm,
      documents,
      expectedCompletionDate: req.body.expectedCompletionDate ? new Date(req.body.expectedCompletionDate) : undefined,
      remarks: req.body.remarks,
      leadStatus: "Submitted",
    });

    lead.statusHistory.push({
      newStatus: "Submitted",
      reason: "Lead Submitted",
      remark: "Submission received from associate",
      updatedBy: req.user.id,
    });
    addAudit(lead, "Lead Created", "Associate submitted a new lead request", req.user);
    if (documents.length) addAudit(lead, "Document Uploaded", `${documents.length} document(s) uploaded`, req.user);
    await lead.save();

    await notifyAdmins({
      title: "New lead submitted",
      message: `${resolvedClient.clientName} was submitted for review`,
      type: "Lead Submitted",
      lead: lead._id,
    });

    const responseLead = lead.toObject();
    responseLead.workId = lead.leadId;
    res.status(201).json({ message: "Work submitted", work: responseLead });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// submitMultiWork — submit one client + multiple services in a single request
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// submitMultiWork — one client + multiple services → ONE lead record
// ---------------------------------------------------------------------------
export const submitMultiWork = async (req, res, next) => {
  try {
    const { clientDetails, clientId, services: servicesJson } = req.body;

    // ── Parse services array ──────────────────────────────────────────────
    let serviceItems = [];
    try {
      serviceItems = typeof servicesJson === "string" ? JSON.parse(servicesJson) : servicesJson;
    } catch {
      return next(errorHandler(400, "Invalid services payload"));
    }
    if (!Array.isArray(serviceItems) || serviceItems.length === 0) {
      return next(errorHandler(400, "At least one service is required"));
    }

    // ── Resolve client ────────────────────────────────────────────────────
    let parsedClientDetails = clientDetails;
    try {
      parsedClientDetails =
        typeof clientDetails === "string" ? JSON.parse(clientDetails || "{}") : clientDetails || {};
    } catch {
      return next(errorHandler(400, "Invalid client details payload"));
    }

    let clientDoc = null;
    const clientIdValue = typeof clientId === "string" ? clientId.trim() : clientId;
    if (clientIdValue) {
      if (mongoose.isValidObjectId(clientIdValue)) {
        clientDoc = await Client.findById(clientIdValue);
        if (!clientDoc) return next(errorHandler(404, "Client not found"));
        if (req.user.role !== "admin" && String(clientDoc.associate) !== req.user.id) {
          return next(errorHandler(403, "Access denied"));
        }
      } else if (!parsedClientDetails?.clientName) {
        return next(errorHandler(400, "Invalid client identifier"));
      }
    }
    if (!clientDoc && parsedClientDetails?.clientName) {
      clientDoc = await upsertClientRecord(req.user.id, parsedClientDetails);
    }

    const resolvedClient = clientDoc
      ? {
          clientName: clientDoc.clientName,
          mobileNumber: clientDoc.mobileNumber,
          email: clientDoc.email,
          address: clientDoc.address,
        }
      : parsedClientDetails;

    if (!resolvedClient?.clientName) {
      return next(errorHandler(400, "Client details are required"));
    }

    // ── Build file index map (fieldname = documents_0, documents_1, …) ───
    const filesByIndex = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        const match = file.fieldname.match(/^documents_(\d+)$/);
        if (match) {
          const idx = Number(match[1]);
          if (!filesByIndex[idx]) filesByIndex[idx] = [];
          filesByIndex[idx].push(file);
        }
      });
    }

    // ── Build embedded service lines ──────────────────────────────────────
    const serviceLines = [];
    let totalServicePrice = 0;
    let totalAssociateEarning = 0;
    const firstDivision = serviceItems[0]?.division;

    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const { division, service, formData: rawFormData } = item;

      if (!division || !service) {
        return next(errorHandler(400, `Service ${i + 1}: division and service are required`));
      }

      let parsedForm = {};
      try {
        parsedForm = typeof rawFormData === "string" ? JSON.parse(rawFormData || "{}") : rawFormData || {};
      } catch {
        parsedForm = {};
      }

      const serviceDoc = await Service.findById(service);
      if (!serviceDoc) return next(errorHandler(404, `Service ${i + 1}: service not found`));
      if (serviceDoc.price == null) return next(errorHandler(400, `Service ${i + 1}: price is not configured`));

      // Validate required form fields for this service
      for (const field of serviceDoc.fields || []) {
        if (field.required && !parsedForm[field.name]) {
          return next(errorHandler(400, `Service ${i + 1} (${serviceDoc.name}): ${field.label} is required`));
        }
      }

      const earningPercent = serviceDoc.associateEarningPercent ?? SERVICE_EARNING_PERCENT;
      const earningAmount = serviceDoc.associateEarningAmount ?? toMoney((serviceDoc.price * earningPercent) / 100);

      const serviceDocs = (filesByIndex[i] || []).map((file) => ({
        name: file.originalname,
        category: "Initial Submission",
        url: toFileUrl(req, file),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: req.user.id,
      }));

      serviceLines.push({
        division,
        service: serviceDoc._id,
        name: serviceDoc.name,
        description: serviceDoc.description || "",
        price: serviceDoc.price,
        quantity: 1,
        amount: serviceDoc.price,
        associateEarningPercent: earningPercent,
        associateEarningAmount: earningAmount,
        formData: parsedForm,
        documents: serviceDocs,
      });

      totalServicePrice += serviceDoc.price;
      totalAssociateEarning += earningAmount;
    }

    // ── Build top-level documents (all files merged, for quick access) ────
    const allDocuments = serviceLines.flatMap((sl) => sl.documents);

    // ── Create ONE lead with all services embedded ────────────────────────
    const serviceNames = serviceLines.map((sl) => sl.name).join(", ");

    const lead = new Lead({
      associate: req.user.id,
      // Populate legacy single-service fields from first service for backward compat
      division: firstDivision,
      service: serviceLines[0]?.service,
      servicePrice: totalServicePrice,
      associateEarningPercent: SERVICE_EARNING_PERCENT,
      associateEarningAmount: toMoney(totalAssociateEarning),
      // Multi-service payload
      services: serviceLines,
      clientId: clientDoc?._id,
      clientDetails: resolvedClient,
      title: serviceLines.length === 1 ? serviceLines[0].name : `${serviceLines.length} Services`,
      description: serviceNames,
      priority: "Normal",
      category: serviceLines.length === 1 ? serviceLines[0].name : "Multiple Services",
      formData: serviceLines[0]?.formData || {},
      documents: allDocuments,
      leadStatus: "Submitted",
    });

    lead.statusHistory.push({
      newStatus: "Submitted",
      reason: "Lead Submitted",
      remark: `Submission received: ${serviceLines.length} service(s) for ${resolvedClient.clientName}`,
      updatedBy: req.user.id,
    });
    addAudit(lead, "Lead Created", `Associate submitted ${serviceLines.length} service(s) in one lead`, req.user);
    if (allDocuments.length) {
      addAudit(lead, "Document Uploaded", `${allDocuments.length} document(s) uploaded`, req.user);
    }

    await lead.save();

    await notifyAdmins({
      title: "New lead submitted",
      message: `${resolvedClient.clientName} — ${serviceLines.length} service(s) submitted for review`,
      type: "Lead Submitted",
      lead: lead._id,
    });

    const responseObj = lead.toObject();
    responseObj.workId = lead.leadId;

    res.status(201).json({ message: "Work submitted", work: responseObj, works: [responseObj] });
  } catch (error) {
    next(error);
  }
};

export const listClients = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const allClients = isAdmin && req.query.allClients === "true";

    // If admin wants all clients, return flat list enriched with lead/work counts
    if (allClients) {
      const clients = await Client.find()
        .populate("associate", "name email")
        .sort({ createdAt: -1 })
        .lean();

      // Aggregate lead counts per clientId
      const leadCounts = await Lead.aggregate([
        { $group: { _id: "$clientId", count: { $sum: 1 } } },
      ]);
      const leadCountMap = new Map(leadCounts.map((r) => [String(r._id), r.count]));

      // Aggregate work counts per client name+mobile (works store clientDetails, not clientId ref)
      // Build a lookup: clientId → { clientName, mobileNumber } from Client docs, then match works
      const clientIds = clients.map((c) => String(c._id));
      const workAgg = await WorkSubmission.aggregate([
        {
          $lookup: {
            from: "clients",
            let: { cn: "$clientDetails.clientName", mob: "$clientDetails.mobileNumber" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$clientName", "$$cn"] },
                      { $eq: ["$mobileNumber", "$$mob"] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "matchedClient",
          },
        },
        { $unwind: "$matchedClient" },
        { $group: { _id: "$matchedClient._id", count: { $sum: 1 } } },
      ]);
      const workCountMap = new Map(workAgg.map((r) => [String(r._id), r.count]));

      const enriched = clients.map((c) => ({
        ...c,
        leadsCount: leadCountMap.get(String(c._id)) || 0,
        worksCount: workCountMap.get(String(c._id)) || 0,
      }));

      return res.status(200).json({ clients: enriched });
    }

    // Otherwise, return grouped clients by associate (existing logic)
    const selectedAssociate = isAdmin && req.query.associate ? req.query.associate : req.user.id;
    const workFilter = { associate: selectedAssociate };
    const clientFilter = { associate: selectedAssociate };

    const [works, clients] = await Promise.all([
      WorkSubmission.find(workFilter)
        .populate("associate", "name email")
        .populate("division", "name")
        .populate("service", "name")
        .sort({ updatedAt: -1 }),
      Client.find(clientFilter).populate("associate", "name email").sort({ createdAt: -1 }),
    ]);

    const groups = new Map();

    const ensureGroup = ({ associateId, associateName, associateEmail, clientName, mobileNumber, email, address, clientId = null }) => {
      const key = [
        associateId,
        clientName,
        mobileNumber,
        email,
        address,
      ].map(normalizeClientPart).join("|");

      if (!groups.has(key)) {
        groups.set(key, {
          clientKey: key,
          clientId,
          clientName: clientName || "Unnamed client",
          mobileNumber: mobileNumber || "",
          email: email || "",
          address: address || "",
          associateId,
          associateName,
          associateEmail,
          worksCount: 0,
          services: [],
          latestStatus: "",
          latestWorkId: "",
          latestUpdatedAt: null,
          workIds: [],
        });
      } else if (clientId) {
        groups.get(key).clientId = clientId;
      }
      return groups.get(key);
    };

    works.forEach((work) => {
      const group = ensureGroup({
        associateId: String(work.associate?._id || work.associate || ""),
        associateName: work.associate?.name || "",
        associateEmail: work.associate?.email || "",
        clientName: work.clientDetails?.clientName || "",
        mobileNumber: work.clientDetails?.mobileNumber || "",
        email: work.clientDetails?.email || "",
        address: work.clientDetails?.address || "",
      });

      group.worksCount += 1;
      group.workIds.push(work._id);

      const serviceName = work.service?.name;
      if (serviceName && !group.services.includes(serviceName)) {
        group.services.push(serviceName);
      }

      const updatedAt = new Date(work.updatedAt || work.createdAt || 0).getTime();
      const latestAt = new Date(group.latestUpdatedAt || 0).getTime();
      if (updatedAt >= latestAt) {
        group.latestUpdatedAt = work.updatedAt || work.createdAt || null;
        group.latestStatus = work.status || "";
        group.latestWorkId = work.workId || "";
      }
    });

    clients.forEach((client) => {
      const group = ensureGroup({
        associateId: String(client.associate?._id || client.associate || ""),
        associateName: client.associate?.name || "",
        associateEmail: client.associate?.email || "",
        clientName: client.clientName,
        mobileNumber: client.mobileNumber,
        email: client.email,
        address: client.address,
        clientId: client._id ? String(client._id) : null,
      });
      if (!group.associateName) group.associateName = client.associate?.name || "";
      if (!group.associateEmail) group.associateEmail = client.associate?.email || "";
    });

    // Attach lead counts per client group
    const leads = await Lead.find({ associate: selectedAssociate })
      .select("clientDetails clientId leadStatus")
      .lean();

    leads.forEach((lead) => {
      const cd = lead.clientDetails || {};
      const key = [
        selectedAssociate,
        cd.clientName,
        cd.mobileNumber,
        cd.email,
        cd.address,
      ].map(normalizeClientPart).join("|");
      const group = groups.get(key);
      if (group) {
        group.leadsCount = (group.leadsCount || 0) + 1;
        group.leadIds = group.leadIds || [];
        group.leadIds.push(lead._id);
      }
    });

    const clientList = Array.from(groups.values()).map((g) => ({
      ...g,
      leadsCount: g.leadsCount || 0,
      leadIds: g.leadIds || [],
    })).sort(
      (a, b) => new Date(b.latestUpdatedAt || 0).getTime() - new Date(a.latestUpdatedAt || 0).getTime()
    );

    res.status(200).json({ clients: clientList });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { clientName, mobileNumber, email, address, associateId } = req.body;
    if (!clientName) return next(errorHandler(400, "Client name is required"));

    const ownerId = req.user.role === "admin" && associateId ? associateId : req.user.id;
    const client = await upsertClientRecord(ownerId, { clientName, mobileNumber, email, address });
    res.status(201).json({ message: "Client saved", client });
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
      clientName,
      mobileNumber,
      email,
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
    if (clientName) filter["clientDetails.clientName"] = new RegExp(clientName, "i");
    if (mobileNumber) filter["clientDetails.mobileNumber"] = new RegExp(mobileNumber, "i");
    if (email) filter["clientDetails.email"] = new RegExp(email, "i");
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

    let invoice = null;
    if (work.invoiceId) {
      invoice = await Invoice.findById(work.invoiceId);
    }
    if (!invoice && work.leadId) {
      invoice = await Invoice.findOne({ leadId: work.leadId });
    }
    if (work.status === "Waiting For Payment" && status !== "Waiting For Payment") {
      if (!invoice || !["Partially Paid", "Paid"].includes(invoice.invoiceStatus)) {
        return next(
          errorHandler(
            400,
            "Work status cannot be changed until the associated invoice is partially paid or paid"
          )
        );
      }
    }

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
            $sum: "$associateEarningAmount",
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

    // ---------------- Module 6: Dashboard Counters (Admin) ----------------
    const [
      totalQuotations,
      draftQuotations,
      acceptedQuotations,
      rejectedQuotations,
      totalInvoices,
      pendingPaymentInvoices,
      paidInvoices,
      activeProjects,
      completedProjects,
      totalComplaints,
    ] = await Promise.all([
      Quotation.countDocuments(),
      Quotation.countDocuments({ status: "Draft" }),
      Quotation.countDocuments({ status: "Accepted" }),
      Quotation.countDocuments({ status: "Rejected" }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ invoiceStatus: { $in: ["Waiting For Payment", "Partially Paid", "Overdue"] } }),
      Invoice.countDocuments({ invoiceStatus: "Paid" }),
      WorkSubmission.countDocuments({ status: { $nin: ["Completed", "Cancelled"] } }),
      WorkSubmission.countDocuments({ status: "Completed" }),
      Complaint.countDocuments(),
    ]);

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
      totalQuotations,
      draftQuotations,
      acceptedQuotations,
      rejectedQuotations,
      totalInvoices,
      pendingPaymentInvoices,
      paidInvoices,
      activeProjects,
      completedProjects,
      totalComplaints,
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

    // ---------------- Module 6: Dashboard Counters (Associate) ----------------
    const [
      myQuotations,
      approvedQuotations,
      rejectedQuotations,
      myInvoices,
      pendingPayments,
      activeProjects,
      myComplaints,
    ] = await Promise.all([
      Quotation.countDocuments({ associate: req.user.id }),
      Quotation.countDocuments({ associate: req.user.id, status: "Accepted" }),
      Quotation.countDocuments({ associate: req.user.id, status: "Rejected" }),
      Invoice.countDocuments({ associate: req.user.id }),
      Invoice.countDocuments({
        associate: req.user.id,
        invoiceStatus: { $in: ["Waiting For Payment", "Partially Paid", "Overdue"] },
      }),
      WorkSubmission.countDocuments({ associate: req.user.id, status: { $nin: ["Completed", "Cancelled"] } }),
      Complaint.countDocuments({ associate: req.user.id }),
    ]);

    Object.assign(statistics, {
      myQuotations,
      approvedQuotations,
      rejectedQuotations,
      myInvoices,
      pendingPayments,
      activeProjects,
      myComplaints,
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