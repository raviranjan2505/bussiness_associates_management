import mongoose from "mongoose";
import ExcelJS from "exceljs";
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
import { getTotalCommission } from "../utils/commission.js";

const associateRoles = ["associate"];
const SERVICE_EARNING_PERCENT = 20;

const normalizeClientPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Makes a "to" date filter inclusive of the entire selected day
// (a bare date string like "2026-07-01" parses as 00:00:00 UTC otherwise,
// which would exclude that day's own records from a range filter).
const endOfDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
};

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

const COMMISSION_TYPES = ["Fixed Amount", "Percentage", "Loan Based"];

const buildServicePricing = (body, existingService = null) => {
  const commissionType = COMMISSION_TYPES.includes(body.commissionType)
    ? body.commissionType
    : existingService?.commissionType || "Percentage";

  const rawCommissionValue =
    body.commissionValue !== undefined && body.commissionValue !== null && body.commissionValue !== ""
      ? body.commissionValue
      : existingService?.commissionValue;
  const commissionValue = Number(rawCommissionValue ?? SERVICE_EARNING_PERCENT);
  if (!Number.isFinite(commissionValue) || commissionValue < 0) {
    throw errorHandler(400, "A valid commission value is required");
  }

  // "Loan Based" services always keep the service charge at ₹0. The actual
  // commission is computed later (at work-creation time) from the Loan
  // Amount the associate enters, so we don't know the earning yet.
  if (commissionType === "Loan Based") {
    return {
      price: 0,
      commissionType,
      commissionValue,
      associateEarningPercent: commissionValue,
      associateEarningAmount: 0,
    };
  }

  const rawPrice = body.price;
  const normalizedPriceSource =
    rawPrice !== undefined && rawPrice !== null && rawPrice !== ""
      ? rawPrice
      : existingService?.price;
  const price = Number(normalizedPriceSource);
  if (!Number.isFinite(price) || price < 0) {
    throw errorHandler(400, "A valid service price is required");
  }

  if (commissionType === "Fixed Amount") {
    const associateEarningAmount = toMoney(commissionValue);
    const associateEarningPercent = price > 0 ? toMoney((associateEarningAmount / price) * 100) : 0;
    return {
      price,
      commissionType,
      commissionValue,
      associateEarningPercent,
      associateEarningAmount,
    };
  }

  // Percentage (default / backward compatible with the old fixed-20% logic)
  const associateEarningPercent = commissionValue;
  const associateEarningAmount = toMoney((price * associateEarningPercent) / 100);

  return {
    price,
    commissionType,
    commissionValue,
    associateEarningPercent,
    associateEarningAmount,
  };
};

// Compute the commission for a "Loan Based" service from the Loan Amount the
// associate entered while creating the work.
const computeLoanCommission = (serviceDoc, loanAmount) => {
  const amount = Number(loanAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw errorHandler(400, `Loan Amount is required for "${serviceDoc.name}"`);
  }
  const percent = Number(serviceDoc.commissionValue ?? serviceDoc.associateEarningPercent ?? 0);
  return {
    loanAmount: amount,
    associateEarningPercent: percent,
    associateEarningAmount: toMoney((amount * percent) / 100),
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

    // Loan Based services: service charge stays ₹0, commission is derived
    // from the Loan Amount entered by the associate.
    let loanAmount = 0;
    let resolvedEarningPercent = serviceDoc.associateEarningPercent ?? SERVICE_EARNING_PERCENT;
    let resolvedEarningAmount =
      serviceDoc.associateEarningAmount ?? toMoney((serviceDoc.price * SERVICE_EARNING_PERCENT) / 100);
    if (serviceDoc.commissionType === "Loan Based") {
      const loanCalc = computeLoanCommission(serviceDoc, req.body.loanAmount);
      loanAmount = loanCalc.loanAmount;
      resolvedEarningPercent = loanCalc.associateEarningPercent;
      resolvedEarningAmount = loanCalc.associateEarningAmount;
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
      associateEarningPercent: resolvedEarningPercent,
      associateEarningAmount: resolvedEarningAmount,
      loanAmount,
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

    let totalLoanAmount = 0;

    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const { division, service, formData: rawFormData, loanAmount: rawLoanAmount } = item;

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

      // Loan Based services: service charge stays ₹0, commission is derived
      // from the Loan Amount the associate enters for this line.
      let lineLoanAmount = 0;
      let earningPercent = serviceDoc.associateEarningPercent ?? SERVICE_EARNING_PERCENT;
      let earningAmount = serviceDoc.associateEarningAmount ?? toMoney((serviceDoc.price * earningPercent) / 100);
      if (serviceDoc.commissionType === "Loan Based") {
        const loanCalc = computeLoanCommission(serviceDoc, rawLoanAmount);
        lineLoanAmount = loanCalc.loanAmount;
        earningPercent = loanCalc.associateEarningPercent;
        earningAmount = loanCalc.associateEarningAmount;
      }

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
        loanAmount: lineLoanAmount,
        formData: parsedForm,
        documents: serviceDocs,
      });

      totalServicePrice += serviceDoc.price;
      totalAssociateEarning += earningAmount;
      totalLoanAmount += lineLoanAmount;
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
      loanAmount: toMoney(totalLoanAmount),
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

    if (allClients) {
      // ── Admin: flat Client docs enriched with real lead + work counts ──────
      const clients = await Client.find()
        .populate("associate", "name email")
        .sort({ createdAt: -1 })
        .lean();

      if (!clients.length) return res.status(200).json({ clients: [] });

      // Build name|mobile → clientId lookup
      const clientByKey = new Map();
      clients.forEach((c) => {
        const k = `${normalizeClientPart(c.clientName)}|${normalizeClientPart(c.mobileNumber)}`;
        clientByKey.set(k, String(c._id));
        // also index by _id string directly for leads that have clientId ref
        clientByKey.set(String(c._id), String(c._id));
      });

      const resolve = (clientId, clientDetails) => {
        // Try direct ObjectId ref first
        if (clientId) {
          const cid = String(clientId);
          if (clientByKey.has(cid)) return clientByKey.get(cid);
        }
        // Fall back to name+mobile match
        const cd = clientDetails || {};
        const k = `${normalizeClientPart(cd.clientName)}|${normalizeClientPart(cd.mobileNumber)}`;
        return clientByKey.get(k) || null;
      };

      const leadCountMap = new Map();
      const workCountMap  = new Map();

      const [allLeads, allWorks] = await Promise.all([
        Lead.find({}).select("clientId clientDetails").lean(),
        WorkSubmission.find({}).select("clientDetails").lean(),
      ]);

      allLeads.forEach((l) => {
        const cid = resolve(l.clientId, l.clientDetails);
        if (cid) leadCountMap.set(cid, (leadCountMap.get(cid) || 0) + 1);
      });

      allWorks.forEach((w) => {
        const cid = resolve(null, w.clientDetails);
        if (cid) workCountMap.set(cid, (workCountMap.get(cid) || 0) + 1);
      });

      const enriched = clients.map((c) => ({
        ...c,
        leadsCount: leadCountMap.get(String(c._id)) || 0,
        worksCount: workCountMap.get(String(c._id)) || 0,
      }));

      return res.status(200).json({ clients: enriched });
    }

    // ── Associate (or admin filtering by associate): grouped client list ─────
    const selectedAssociate = isAdmin && req.query.associate
      ? req.query.associate
      : req.user.id;

    const [leads, works, clientDocs] = await Promise.all([
      Lead.find({ associate: selectedAssociate })
        .select("clientDetails clientId leadStatus createdAt updatedAt")
        .lean(),
      WorkSubmission.find({ associate: selectedAssociate })
        .populate("associate", "name email")
        .populate("division", "name")
        .populate("service", "name")
        .sort({ updatedAt: -1 })
        .lean(),
      Client.find({ associate: selectedAssociate })
        .populate("associate", "name email")
        .lean(),
    ]);

    // ── Build groups keyed by normalised name|mobile ─────────────────────────
    // Key does NOT include associateId so leads/works/clients all hash the same way
    const groups = new Map();

    const groupKey = (clientName, mobileNumber) =>
      `${normalizeClientPart(clientName)}|${normalizeClientPart(mobileNumber)}`;

    const ensureGroup = ({ clientName, mobileNumber, email, address, clientId, associateName, associateEmail, aadhaarNumber, pan }) => {
      const key = groupKey(clientName, mobileNumber);
      if (!groups.has(key)) {
        groups.set(key, {
          clientKey: key,
          clientId: clientId || null,
          clientName: clientName || "Unnamed client",
          mobileNumber: mobileNumber || "",
          email: email || "",
          address: address || "",
          aadhaarNumber: aadhaarNumber || "",
          pan: pan || "",
          associateId: selectedAssociate,
          associateName: associateName || "",
          associateEmail: associateEmail || "",
          leadsCount: 0,
          worksCount: 0,
          leadIds: [],
          workIds: [],
          services: [],
          latestStatus: "",
          latestWorkId: "",
          latestUpdatedAt: null,
        });
      }
      const g = groups.get(key);
      // Upgrade fields if we now have more info
      if (clientId && !g.clientId) g.clientId = clientId;
      if (associateName && !g.associateName) g.associateName = associateName;
      if (associateEmail && !g.associateEmail) g.associateEmail = associateEmail;
      // Leads/works only carry a denormalized clientDetails snapshot (no
      // Aadhaar/PAN); the Client document itself (step 3 below) is the
      // authoritative source for these, so fill them in whenever available.
      if (aadhaarNumber && !g.aadhaarNumber) g.aadhaarNumber = aadhaarNumber;
      if (pan && !g.pan) g.pan = pan;
      return g;
    };

    // 1. Seed groups from leads (they appear first, before works exist)
    leads.forEach((lead) => {
      const cd = lead.clientDetails || {};
      const g = ensureGroup({
        clientName: cd.clientName,
        mobileNumber: cd.mobileNumber,
        email: cd.email,
        address: cd.address,
        clientId: lead.clientId ? String(lead.clientId) : null,
        associateName: "",
        associateEmail: "",
      });
      g.leadsCount += 1;
      g.leadIds.push(lead._id);
      const at = new Date(lead.updatedAt || lead.createdAt || 0).getTime();
      if (!g.latestUpdatedAt || at > new Date(g.latestUpdatedAt).getTime()) {
        g.latestUpdatedAt = lead.updatedAt || lead.createdAt;
      }
    });

    // 2. Enrich / extend groups from works
    works.forEach((work) => {
      const cd = work.clientDetails || {};
      const g = ensureGroup({
        clientName: cd.clientName,
        mobileNumber: cd.mobileNumber,
        email: cd.email,
        address: cd.address,
        clientId: null,
        associateName: work.associate?.name || "",
        associateEmail: work.associate?.email || "",
      });
      g.worksCount += 1;
      g.workIds.push(work._id);
      const svcName = work.service?.name;
      if (svcName && !g.services.includes(svcName)) g.services.push(svcName);
      const at = new Date(work.updatedAt || work.createdAt || 0).getTime();
      if (!g.latestUpdatedAt || at > new Date(g.latestUpdatedAt).getTime()) {
        g.latestUpdatedAt = work.updatedAt || work.createdAt;
        g.latestStatus = work.status || "";
        g.latestWorkId = work.workId || "";
      }
    });

    // 3. Ensure Client docs create a group entry (handles clients with no leads/works yet)
    clientDocs.forEach((c) => {
      ensureGroup({
        clientName: c.clientName,
        mobileNumber: c.mobileNumber,
        email: c.email,
        address: c.address,
        clientId: String(c._id),
        associateName: c.associate?.name || "",
        associateEmail: c.associate?.email || "",
        aadhaarNumber: c.aadhaarNumber || "",
        pan: c.pan || "",
      });
    });

    const clientList = Array.from(groups.values()).sort(
      (a, b) => new Date(b.latestUpdatedAt || 0) - new Date(a.latestUpdatedAt || 0)
    );

    res.status(200).json({ clients: clientList });
  } catch (error) {
    next(error);
  }
};


export const createClient = async (req, res, next) => {
  try {
    const { clientName, mobileNumber, email, address, clientType, aadhaarNumber, pan, associateId } = req.body;

    // Validation
    if (!clientName?.trim()) return next(errorHandler(400, "Full name is required"));
    if (!mobileNumber?.trim()) return next(errorHandler(400, "Mobile number is required"));
    if (!/^[0-9]{10}$/.test(mobileNumber.trim())) return next(errorHandler(400, "Mobile number must be exactly 10 digits"));
    if (!aadhaarNumber?.trim()) return next(errorHandler(400, "Aadhaar number is required"));
    if (!/^[0-9]{12}$/.test(aadhaarNumber.trim())) return next(errorHandler(400, "Aadhaar number must be exactly 12 digits"));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return next(errorHandler(400, "Invalid email address"));
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())) return next(errorHandler(400, "Invalid PAN number format (e.g. ABCDE1234F)"));

    const ownerId = req.user.role === "admin" && associateId ? associateId : req.user.id;

    // Check mobile uniqueness per associate
    const existing = await Client.findOne({ associate: ownerId, mobileNumber: mobileNumber.trim() });
    if (existing) return next(errorHandler(409, "A client with this mobile number already exists"));

    const client = await Client.create({
      associate: ownerId,
      clientName: clientName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email?.trim().toLowerCase() || undefined,
      address: address?.trim() || undefined,
      clientType: clientType || "Individual",
      aadhaarNumber: aadhaarNumber.trim(),
      pan: pan ? pan.trim().toUpperCase() : null,
    });

    await client.populate("associate", "name email");
    res.status(201).json({ message: "Client saved successfully", client });
  } catch (error) {
    if (error.code === 11000) return next(errorHandler(409, "A client with this mobile number already exists"));
    next(error);
  }
};

export const exportClients = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const filter = isAdmin ? {} : { associate: req.user.id };

    const clients = await Client.find(filter)
      .populate("associate", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Clients");

    worksheet.columns = [
      { header: "Client Name", key: "clientName", width: 25 },
      { header: "Mobile Number", key: "mobileNumber", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Address", key: "address", width: 35 },
      { header: "Client Type", key: "clientType", width: 15 },
      { header: "Aadhaar Number", key: "aadhaarNumber", width: 18 },
      { header: "PAN", key: "pan", width: 15 },
      { header: "Associate", key: "associateName", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    clients.forEach((client) => {
      worksheet.addRow({
        clientName: client.clientName || "",
        mobileNumber: client.mobileNumber || "",
        email: client.email || "",
        address: client.address || "",
        clientType: client.clientType || "",
        aadhaarNumber: client.aadhaarNumber || "",
        pan: client.pan || "",
        associateName: client.associate?.name || "",
        createdAt: client.createdAt ? new Date(client.createdAt).toLocaleString() : "",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${isAdmin ? "clients" : "my-clients"}.xlsx`
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).populate("associate", "name email");
    if (!client) return next(errorHandler(404, "Client not found"));
    // Associates can only view their own clients; admins can view all
    if (req.user.role !== "admin" && String(client.associate._id || client.associate) !== req.user.id) {
      return next(errorHandler(403, "Access denied"));
    }
    res.status(200).json({ client });
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return next(errorHandler(404, "Client not found"));

    // Only the creating associate (or admin) can edit
    if (req.user.role !== "admin" && String(client.associate) !== req.user.id) {
      return next(errorHandler(403, "You can only edit clients you have created"));
    }

    const { clientName, mobileNumber, email, address, clientType, aadhaarNumber, pan } = req.body;

    // Validation
    if (clientName !== undefined && !clientName?.trim()) return next(errorHandler(400, "Full name is required"));
    if (mobileNumber !== undefined && !/^[0-9]{10}$/.test(mobileNumber.trim())) return next(errorHandler(400, "Mobile number must be exactly 10 digits"));
    if (aadhaarNumber !== undefined && !/^[0-9]{12}$/.test(aadhaarNumber.trim())) return next(errorHandler(400, "Aadhaar number must be exactly 12 digits"));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return next(errorHandler(400, "Invalid email address"));
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())) return next(errorHandler(400, "Invalid PAN number format"));

    // Check mobile uniqueness if changed
    if (mobileNumber && mobileNumber.trim() !== client.mobileNumber) {
      const dup = await Client.findOne({ associate: client.associate, mobileNumber: mobileNumber.trim(), _id: { $ne: client._id } });
      if (dup) return next(errorHandler(409, "A client with this mobile number already exists"));
    }

    if (clientName !== undefined) client.clientName = clientName.trim();
    if (mobileNumber !== undefined) client.mobileNumber = mobileNumber.trim();
    if (email !== undefined) client.email = email?.trim().toLowerCase() || undefined;
    if (address !== undefined) client.address = address?.trim() || undefined;
    if (clientType !== undefined) client.clientType = clientType;
    if (aadhaarNumber !== undefined) client.aadhaarNumber = aadhaarNumber.trim();
    if (pan !== undefined) client.pan = pan ? pan.trim().toUpperCase() : null;

    await client.save();
    await client.populate("associate", "name email");
    res.status(200).json({ message: "Client updated successfully", client });
  } catch (error) {
    if (error.code === 11000) return next(errorHandler(409, "A client with this mobile number already exists"));
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return next(errorHandler(404, "Client not found"));

    // Only the creating associate (or admin) can delete
    if (req.user.role !== "admin" && String(client.associate) !== req.user.id) {
      return next(errorHandler(403, "You can only delete clients you have created"));
    }

    await client.deleteOne();
    res.status(200).json({ message: "Client deleted successfully" });
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
      clientId,
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
    // Associates are always scoped to their own works, regardless of any
    // other filter applied below (e.g. clientId) — this keeps the
    // Associate panel's "View Work" restricted to the logged-in associate.
    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (status) filter.status = status;
    if (division) filter.division = division;
    if (service) filter.service = service;
    if (associate && req.user.role === "admin") filter.associate = associate;

    // Filter by a specific client's Mongo _id (used by the "View Work" action
    // from a Client List). WorkSubmission doesn't store a direct client
    // reference, so we resolve the Client doc and match on its unique
    // mobile number (or exact client name as a fallback) — this guarantees
    // only that client's works are returned, never another client's.
    if (clientId) {
      if (!mongoose.isValidObjectId(clientId)) return next(errorHandler(400, "Invalid client identifier"));
      const clientDoc = await Client.findById(clientId).select("clientName mobileNumber associate");
      if (!clientDoc || (req.user.role !== "admin" && String(clientDoc.associate) !== req.user.id)) {
        // No such client, or an associate trying to view another associate's
        // client — return an empty result set instead of erroring, so the UI
        // can show "No work found for this client."
        filter._id = { $in: [] };
      } else if (clientDoc.mobileNumber) {
        filter["clientDetails.mobileNumber"] = new RegExp(`^${escapeRegex(clientDoc.mobileNumber)}$`, "i");
      } else {
        filter["clientDetails.clientName"] = new RegExp(`^${escapeRegex(clientDoc.clientName)}$`, "i");
      }
    }

    if (clientName) filter["clientDetails.clientName"] = new RegExp(clientName, "i");
    if (mobileNumber) filter["clientDetails.mobileNumber"] = new RegExp(mobileNumber, "i");
    if (email) filter["clientDetails.email"] = new RegExp(email, "i");
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = endOfDay(to);
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

// ── Work List summary cards (Total / Pending / Completed / Rejected) ─────
// Backed by simple counts on the existing WorkSubmission collection —
// no new collection, no duplicated data. Respects the same role scoping as
// listWorks (associates only see their own works) and, when a date range
// is supplied, restricts the counts to that range so the cards reflect
// exactly what the date filter selects.
export const getWorksSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = endOfDay(to);

    const [total, completed, rejected] = await Promise.all([
      WorkSubmission.countDocuments(filter),
      WorkSubmission.countDocuments({ ...filter, status: "Completed" }),
      WorkSubmission.countDocuments({ ...filter, status: "Rejected" }),
    ]);
    // "Pending" covers every work item that isn't finished yet (Pending,
    // Under Review, Documents Required, In Process, Waiting For Payment),
    // so the four cards always add up to the Total.
    const pending = Math.max(total - completed - rejected, 0);

    res.status(200).json({ total, pending, completed, rejected });
  } catch (error) {
    next(error);
  }
};

// ── Group works by client for one associate (admin) ──────────────────────────
// Used by: Associates List → Work count → Client Groups page
// Server-side aggregation avoids shipping every work row and re-grouping in JS.
export const groupWorksByClientForAssociate = async (req, res, next) => {
  try {
    const { associateId } = req.params;
    if (!mongoose.isValidObjectId(associateId)) {
      return next(errorHandler(400, "Invalid associate identifier"));
    }
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));

    const groups = await WorkSubmission.aggregate([
      { $match: { associate: new mongoose.Types.ObjectId(associateId) } },
      {
        $addFields: {
          normName: { $trim: { input: { $toLower: { $ifNull: ["$clientDetails.clientName", ""] } } } },
          normMobile: { $trim: { input: { $ifNull: ["$clientDetails.mobileNumber", ""] } } },
        },
      },
      {
        $group: {
          _id: { name: "$normName", mobile: "$normMobile" },
          clientName: { $first: "$clientDetails.clientName" },
          mobileNumber: { $first: "$clientDetails.mobileNumber" },
          email: { $first: "$clientDetails.email" },
          totalWorks: { $sum: 1 },
          latestStatus: { $last: "$status" },
          latestUpdatedAt: { $max: { $ifNull: ["$updatedAt", "$createdAt"] } },
        },
      },
      { $sort: { latestUpdatedAt: -1 } },
    ]);

    res.status(200).json({
      clients: groups.map((g) => ({
        clientName: g.clientName || "Unnamed client",
        mobileNumber: g.mobileNumber || "",
        email: g.email || "",
        totalWorks: g.totalWorks,
        latestStatus: g.latestStatus || "",
        latestUpdatedAt: g.latestUpdatedAt,
      })),
    });
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
    // Total Commission — sirf completed work ki earning. Shared helper keeps
    // this identical to the Income page's Total Commission card.
    const totalIncome = await getTotalCommission();

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
    // Fetched wider than one page so the dashboard's Recent Activities table
    // can be paginated client-side without a separate endpoint.
    const recentWorks = await WorkSubmission.find()
      .populate("associate", "name")
      .populate("division", "name")
      .populate("service", "name")
      .sort({ updatedAt: -1 })
      .limit(50);

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
    // Keep "Pending Works" consistent with the Work List page's summary card:
    // both represent every work item that isn't Completed or Rejected yet
    // (Pending, Under Review, Documents Required, In Process), rather than
    // only the literal "Pending" status.
    statistics.Pending = Math.max(
      statistics.totalWorkRequests - statistics.Completed - statistics.Rejected,
      0
    );

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
    // Total Commission of current associate — sirf completed works ki earning.
    // Shared helper keeps this identical to the Income page's Total Commission card.
    const totalIncome = await getTotalCommission(userId);

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
    // Keep "Pending" consistent with the associate's Work List summary card:
    // both represent every work item that isn't Completed or Rejected yet,
    // rather than only the literal "Pending" status.
    statistics.Pending = Math.max(
      statistics.mySubmittedWork - statistics.Completed - statistics.Rejected,
      0
    );

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
    // Fetched wider than one page so the dashboard's Recent Activity table
    // can be paginated client-side without a separate endpoint.
    const recentWorks = await WorkSubmission.find({ associate: req.user.id })
      .populate("division", "name")
      .populate("service", "name")
      .sort({ updatedAt: -1 })
      .limit(50);
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

// Used by the notification bell badge — kept as a lightweight count-only
// query so it can be polled frequently without pulling full notification data.
export const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, read: false });
    res.status(200).json({ count });
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

// Lets a user (admin or associate) remove a notification once they've read
// it. Scoped to the requesting user so no one can delete another user's
// notifications, and restricted to already-read ones so nothing unseen is
// ever lost by accident.
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.id });
    if (!notification) return next(errorHandler(404, "Notification not found"));
    if (!notification.read) return next(errorHandler(400, "Only read notifications can be deleted"));
    await Notification.deleteOne({ _id: notification._id });
    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
};