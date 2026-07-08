import mongoose from "mongoose";
import Quotation, { QUOTATION_STATUSES } from "../models/quotation.model.js";
import Client from "../models/client.model.js";
import Lead from "../models/lead.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import Service from "../models/service.model.js";
import Invoice from "../models/invoice.model.js";
import { errorHandler } from "../utils/error.js";
import { toMoney } from "../utils/money.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { generateSequenceNumber } from "../utils/sequence.js";
import { convertLeadToWork } from "../utils/leadConversion.js";
import { streamQuotationPdf, streamClientQuotationPdf, buildClientQuotationHtml } from "../utils/pdfGenerator.js";
import { sendMail } from "../utils/mailer.js";

const ensureQuotationAccess = (quotation, user) => {
  if (user.role === "admin") return true;
  return String(quotation.associate?._id || quotation.associate) === user.id;
};

const populateQuotation = (query) =>
  query
    .populate("associate", "name email profileImageUrl")
    .populate("services.service", "name price")
    .populate("invoiceId", "invoiceNumber totalAmount invoiceStatus")
    .populate("leadId", "leadId leadStatus clientDetails")
    .populate("leadIds", "leadId leadStatus");

// Build/refresh the embedded services array (and let the pre-validate hook recompute totals)
const buildServiceLines = async (services = []) => {
  if (!Array.isArray(services) || !services.length) {
    throw errorHandler(400, "At least one service is required");
  }

  const lines = [];
  for (const item of services) {
    if (item.service) {
      const serviceDoc = await Service.findById(item.service);
      if (!serviceDoc) throw errorHandler(404, `Service ${item.service} not found`);
      lines.push({
        service: serviceDoc._id,
        name: serviceDoc.name,
        description: serviceDoc.description,
        price: item.price !== undefined ? Number(item.price) : serviceDoc.price,
        quantity: Number(item.quantity || 1),
        amount: toMoney((item.price !== undefined ? Number(item.price) : serviceDoc.price) * Number(item.quantity || 1)),
      });
    } else {
      if (!item.name || item.price === undefined) {
        throw errorHandler(400, "Each custom service line requires a name and price");
      }
      lines.push({
        name: item.name,
        description: item.description,
        price: Number(item.price),
        quantity: Number(item.quantity || 1),
        amount: toMoney(Number(item.price) * Number(item.quantity || 1)),
      });
    }
  }
  return lines;
};

// ---------------------------------------------------------------------------
// Module 1: Quotation Management
// ---------------------------------------------------------------------------

export const createQuotation = async (req, res, next) => {
  try {
    const { associate, customerName, customerEmail, customerPhone, clientId, workId, leadIds, services, notes, terms, discount, tax, validUntil } = req.body;

    let client = null;
    let work = null;
    let associateId = associate || req.user.id;
    let quotationServices = [];
    let quotationLeadId = null;
    let quotationLeadIds = [];

    if (Array.isArray(leadIds) && leadIds.length) {
      const invalidLeadIds = leadIds.filter((id) => !mongoose.isValidObjectId(id));
      if (invalidLeadIds.length) return next(errorHandler(400, "Invalid lead identifiers provided"));

      const leads = await Lead.find({ _id: { $in: leadIds } }).populate("associate", "name email").populate("service", "name price associateEarningPercent associateEarningAmount");
      if (leads.length !== leadIds.length) return next(errorHandler(404, "One or more selected leads were not found"));

      if (req.user.role !== "admin") {
        const invalidLead = leads.find((lead) => String(lead.associate?._id || lead.associate) !== req.user.id);
        if (invalidLead) return next(errorHandler(403, "You can only create quotations for your own leads"));
      }

      if (associate && leads.some((lead) => String(lead.associate?._id || lead.associate) !== String(associate))) {
        return next(errorHandler(400, "Selected associate does not match the selected leads"));
      }

      if (clientId && leads.some((lead) => String(lead.clientId || "") !== String(clientId))) {
        return next(errorHandler(400, "Selected client does not match the selected leads"));
      }

      const firstLead = leads[0];
      if (!clientId && firstLead.clientId) client = await Client.findById(firstLead.clientId);
      if (clientId) {
        client = await Client.findById(clientId);
        if (!client) return next(errorHandler(404, "Client not found"));
      }

      // Build service lines — for multi-service leads expand ALL embedded services;
      // for legacy single-service leads use the top-level service field.
      // Track which leadId each service line belongs to (parallel array).
      const quotationServiceLeadIds = []; // quotationServiceLeadIds[i] = leadId of quotationServices[i]

      for (const lead of leads) {
        if (Array.isArray(lead.services) && lead.services.length > 0) {
          // Multi-service lead — expand every embedded service
          for (const svc of lead.services) {
            quotationServices.push({
              service: svc.service,
              name: svc.name,
              description: svc.description || `Lead ${lead.leadId}`,
              price: Number(svc.price || 0),
              quantity: Number(svc.quantity || 1),
              amount: Number(svc.amount || svc.price || 0),
              associateEarningPercent: Number(svc.associateEarningPercent || 0),
              associateEarningAmount: Number(svc.associateEarningAmount || 0),
            });
            quotationServiceLeadIds.push(lead._id);
          }
        } else {
          // Legacy single-service lead
          const servicePrice = lead.servicePrice ?? lead.service?.price ?? 0;
          quotationServices.push({
            service: lead.service?._id,
            name: lead.service?.name || `Lead ${lead.leadId}`,
            description: `Lead ${lead.leadId}`,
            price: Number(servicePrice),
            quantity: 1,
            amount: Number(servicePrice),
            associateEarningPercent: lead.associateEarningPercent || 0,
            associateEarningAmount: lead.associateEarningAmount || 0,
          });
          quotationServiceLeadIds.push(lead._id);
        }
      }

      // Store the per-service lead mapping on the quotation so acceptQuotation
      // can reconstruct which services belong to which lead.
      quotationLeadIds = leads.map((lead) => lead._id);
      if (leads.length === 1) quotationLeadId = leads[0]._id;
      // Attach the per-line lead-id array for acceptQuotation to use
      req._quotationServiceLeadIds = quotationServiceLeadIds;

      if (!customerName && firstLead.clientDetails?.clientName) {
        req.body.customerName = firstLead.clientDetails.clientName;
      }
      if (customerEmail === undefined && firstLead.clientDetails?.email) {
        req.body.customerEmail = firstLead.clientDetails.email;
      }
      if (customerPhone === undefined && firstLead.clientDetails?.mobileNumber) {
        req.body.customerPhone = firstLead.clientDetails.mobileNumber;
      }
    }

    if (workId && quotationServices.length === 0) {
      work = await WorkSubmission.findById(workId).populate("associate", "name email");
      if (!work) return next(errorHandler(404, "Work not found"));
      if (associate && String(associate) !== String(work.associate?._id || work.associate)) {
        return next(errorHandler(400, "Selected associate does not match the selected work"));
      }
      associateId = String(work.associate?._id || work.associate);
      if (!clientId) {
        client = {
          _id: work.clientDetails?._id,
          clientName: work.clientDetails?.clientName,
          email: work.clientDetails?.email,
          mobileNumber: work.clientDetails?.mobileNumber,
        };
      }
    }

    if (clientId) {
      client = await Client.findById(clientId);
      if (!client) return next(errorHandler(404, "Client not found"));
      if (work && String(work.associate?._id || work.associate) !== String(client.associate)) {
        return next(errorHandler(400, "Selected client does not belong to the selected work"));
      }
    }

    const resolvedCustomerName = customerName || client?.clientName;
    const resolvedCustomerEmail = customerEmail !== undefined ? customerEmail : client?.email;
    const resolvedCustomerPhone = customerPhone !== undefined ? customerPhone : client?.mobileNumber;

    if (!resolvedCustomerName) return next(errorHandler(400, "Customer name is required"));

    if (!quotationServices.length && !services?.length) {
      return next(errorHandler(400, "At least one service or lead selection is required"));
    }

    const serviceLines = quotationServices.length ? quotationServices : await buildServiceLines(services);

    const quotationNumber = await generateSequenceNumber(Quotation, "QUO");

    const quotation = new Quotation({
      quotationNumber,
      associate: associateId,
      leadId: quotationLeadId,
      leadIds: quotationLeadIds,
      serviceLeadIds: req._quotationServiceLeadIds || [],
      client: client?._id,
      customerName: resolvedCustomerName,
      customerEmail: resolvedCustomerEmail,
      customerPhone: resolvedCustomerPhone,
      services: serviceLines,
      discount: discount || undefined,
      tax: tax || undefined,
      notes,
      terms,
      validUntil,
      status: "Draft",
      createdBy: req.user.id,
    });

    await quotation.save();

    res.status(201).json({ message: "Quotation draft created", quotation });
  } catch (error) {
    next(error);
  }
};

export const listQuotations = async (req, res, next) => {
  try {
    const { status, search, from, to } = req.query;
    const filter = {};

    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (status && QUOTATION_STATUSES.includes(status)) filter.status = status;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    if (search) {
      filter.$or = [
        { quotationNumber: new RegExp(search, "i") },
        { customerName: new RegExp(search, "i") },
        { customerEmail: new RegExp(search, "i") },
      ];
    }

    const quotations = await populateQuotation(Quotation.find(filter)).sort({ createdAt: -1 });
    res.status(200).json({ quotations });
  } catch (error) {
    next(error);
  }
};

// Summary cards for the Quotations list (Total / Draft / Accepted / Rejected),
// scoped the same way as listQuotations (associates only see their own).
export const getQuotationsSummary = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") filter.associate = req.user.id;

    const [total, draft, accepted, rejected] = await Promise.all([
      Quotation.countDocuments(filter),
      Quotation.countDocuments({ ...filter, status: "Draft" }),
      Quotation.countDocuments({ ...filter, status: "Accepted" }),
      Quotation.countDocuments({ ...filter, status: "Rejected" }),
    ]);

    res.status(200).json({ summary: { total, draft, accepted, rejected } });
  } catch (error) {
    next(error);
  }
};

export const getQuotation = async (req, res, next) => {
  try {
    const quotation = await populateQuotation(Quotation.findById(req.params.id));
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user)) return next(errorHandler(403, "Access denied"));
    res.status(200).json(quotation);
  } catch (error) {
    next(error);
  }
};

// Admin edit: service price, discount, tax, notes & terms (Module 1, step 5)
export const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));

    if (!["Draft", "Sent"].includes(quotation.status)) {
      return next(errorHandler(400, "Only draft or sent quotations can be edited"));
    }

    const { services, discount, tax, notes, terms, validUntil, customerName, customerEmail, customerPhone } = req.body;

    if (services) {
      quotation.services = await buildServiceLines(services);
    }
    if (discount) {
      quotation.discount = { ...quotation.discount.toObject(), ...discount };
    }
    if (tax) {
      quotation.tax = { ...quotation.tax.toObject(), ...tax };
    }
    if (notes !== undefined) quotation.notes = notes;
    if (terms !== undefined) quotation.terms = terms;
    if (validUntil !== undefined) quotation.validUntil = validUntil;
    if (customerName) quotation.customerName = customerName;
    if (customerEmail !== undefined) quotation.customerEmail = customerEmail;
    if (customerPhone !== undefined) quotation.customerPhone = customerPhone;

    await quotation.save();

    res.status(200).json({ message: "Quotation updated", quotation });
  } catch (error) {
    next(error);
  }
};

export const deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (quotation.status !== "Draft") return next(errorHandler(400, "Only draft quotations can be deleted"));
    await quotation.deleteOne();
    res.status(200).json({ message: "Quotation deleted" });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Module 2: Quotation Approval Workflow
// ---------------------------------------------------------------------------

// Admin sends the quotation to the associate for review
export const sendQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (quotation.status !== "Draft") return next(errorHandler(400, "Only draft quotations can be sent"));

    quotation.status = "Sent";
    quotation.sentAt = new Date();
    await quotation.save();

    await notify({
      user: quotation.associate,
      title: "Quotation ready for review",
      message: `Quotation ${quotation.quotationNumber} for ${quotation.customerName} is ready for your review`,
      type: "Quotation Sent",
      quotation: quotation._id,
    });

    res.status(200).json({ message: "Quotation sent to associate", quotation });
  } catch (error) {
    next(error);
  }
};

// Associate accepts a sent quotation -> auto-generate invoice
export const acceptQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user) || req.user.role === "admin") {
      return next(errorHandler(403, "Only the owning associate can accept this quotation"));
    }
    if (quotation.status !== "Sent") return next(errorHandler(400, "Only sent quotations can be accepted"));

    quotation.status = "Accepted";
    quotation.respondedAt = new Date();
    await quotation.save();

    const quoteLeadIds = [quotation.leadId, ...(quotation.leadIds || [])].filter(Boolean).map(String);
    const uniqueLeadIds = [...new Set(quoteLeadIds)];
    const createdWorks = [];
    const createdInvoices = [];

    if (uniqueLeadIds.length) {
      // ── Lead-linked quotation: one invoice per lead (with ALL its services) ─
      const leads = await Lead.find({ _id: { $in: uniqueLeadIds } }).populate(
        "service",
        "name price associateEarningPercent associateEarningAmount"
      );
      if (leads.length !== uniqueLeadIds.length) return next(errorHandler(404, "One or more linked leads were not found"));

      // Build a map: leadId → [ ...all quotation service lines for that lead ]
      // Use serviceLeadIds[] (parallel to services[]) if available — it is the
      // authoritative per-service lead mapping stored at quotation creation time.
      // Fall back to quoteLeadIds[index] for older quotations that pre-date this field.
      const servicesByLead = new Map();
      const svcLeadIds = (quotation.serviceLeadIds || []).length
        ? quotation.serviceLeadIds.map(String)
        : quoteLeadIds;  // legacy fallback

      (quotation.services || []).forEach((svc, index) => {
        const leadId = String(svcLeadIds[index] || "");
        if (!leadId || leadId === "undefined") return;
        if (!servicesByLead.has(leadId)) servicesByLead.set(leadId, []);
        servicesByLead.get(leadId).push(svc);
      });

      for (const lead of leads) {
        const leadIdStr = String(lead._id);

        // All service lines for this lead from the quotation
        let lines = servicesByLead.get(leadIdStr) || [];

        // Fallback for legacy single-service leads not in the map
        if (!lines.length) {
          const price = Number(lead.servicePrice ?? lead.service?.price ?? 0);
          lines = [{
            service: lead.service?._id,
            name: lead.service?.name || `Lead ${lead.leadId}`,
            description: `Lead ${lead.leadId}`,
            price,
            quantity: 1,
            amount: price,
            associateEarningPercent: lead.associateEarningPercent || 0,
            associateEarningAmount: lead.associateEarningAmount || 0,
          }];
        }

        // Subtotal for this lead's services
        const subtotal = Number(lines.reduce((s, l) => s + Number(l.amount || 0), 0).toFixed(2));

        // Pro-rate flat discount by this lead's share of the quotation subtotal
        const invoiceDiscount = { ...(quotation.discount?.toObject?.() || quotation.discount || {}) };
        if (quotation.discount?.type === "flat") {
          const totalDiscount = Number(quotation.discount.amount ?? quotation.discount.value ?? 0);
          invoiceDiscount.amount = Number(
            ((subtotal / Math.max(quotation.subtotal, 1)) * totalDiscount).toFixed(2)
          );
        } else if (quotation.discount?.type === "percentage") {
          invoiceDiscount.amount = Number(
            ((subtotal * (Number(quotation.discount.value) || 0)) / 100).toFixed(2)
          );
        }

        const taxedBase = Math.max(subtotal - (invoiceDiscount.amount || 0), 0);
        const invoiceTax = {
          percent: quotation.tax?.percent || 0,
          amount: Number(((taxedBase * (quotation.tax?.percent || 0)) / 100).toFixed(2)),
        };
        const invoiceTotal = Number((taxedBase + invoiceTax.amount).toFixed(2));

        const work = await convertLeadToWork(lead, {
          status: "Waiting For Payment",
          reason: "Quotation accepted",
          remark: "Work created after quotation acceptance",
          updatedBy: quotation.associate,
        });

        const invoiceNumber = await generateSequenceNumber(Invoice, "INV");
        const invoice = await Invoice.create({
          invoiceNumber,
          quotation: quotation._id,
          leadId: lead._id,
          associate: quotation.associate,
          customerName: quotation.customerName,
          customerEmail: quotation.customerEmail,
          customerPhone: quotation.customerPhone,
          services: lines,          // ← ALL services for this lead, not just one
          subtotal,
          discount: invoiceDiscount,
          tax: invoiceTax,
          totalAmount: invoiceTotal,
          amountPaid: 0,
          balanceDue: invoiceTotal,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          invoiceStatus: "Waiting For Payment",
          notes: quotation.notes,
          terms: quotation.terms,
          createdBy: req.user.id,
        });

        if (work) { work.invoiceId = invoice._id; await work.save(); }
        if (!lead.invoiceId) { lead.invoiceId = invoice._id; await lead.save(); }

        createdWorks.push(work);
        createdInvoices.push(invoice);
      }
    } else {
      // ── Standalone quotation (no linked leads): single invoice ───────────
      const subtotal = Number(quotation.subtotal || 0);
      const discountAmt = Number(quotation.discount?.amount || 0);
      const taxedBase = Math.max(subtotal - discountAmt, 0);
      const taxAmount = Number(((taxedBase * (quotation.tax?.percent || 0)) / 100).toFixed(2));
      const invoiceTotal = Number((taxedBase + taxAmount).toFixed(2));

      const invoiceNumber = await generateSequenceNumber(Invoice, "INV");
      const invoice = await Invoice.create({
        invoiceNumber,
        quotation: quotation._id,
        associate: quotation.associate,
        client: quotation.client,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        customerPhone: quotation.customerPhone,
        services: quotation.services,
        subtotal,
        discount: quotation.discount,
        tax: { percent: quotation.tax?.percent || 0, amount: taxAmount },
        totalAmount: invoiceTotal,
        amountPaid: 0,
        balanceDue: invoiceTotal,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        invoiceStatus: "Waiting For Payment",
        notes: quotation.notes,
        terms: quotation.terms,
        createdBy: req.user.id,
      });
      createdInvoices.push(invoice);
    }

    // ── Link first invoice back onto quotation so the UI can find it ─────
    if (createdInvoices.length > 0) {
      quotation.invoiceId = createdInvoices[0]._id;
      await quotation.save();
    }

    await notify({
      user: quotation.associate,
      title: "Invoice generated",
      message: `Invoice generated for accepted quotation ${quotation.quotationNumber}`,
      type: "Invoice Generated",
      invoice: createdInvoices[0]?._id,
    });

    await notifyAdmins({
      title: "Quotation accepted",
      message: `${quotation.customerName} accepted quotation ${quotation.quotationNumber}. Invoice generated.`,
      type: "Quotation Accepted",
      quotation: quotation._id,
    });

    res.status(200).json({
      message: "Quotation accepted and invoice created",
      quotation,
      works: createdWorks,
      invoices: createdInvoices,
      invoice: createdInvoices[0] || null,
    });
  } catch (error) {
    next(error);
  }
};

// Associate rejects a sent quotation with a reason
export const rejectQuotation = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return next(errorHandler(400, "Rejection reason is required"));

    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user) || req.user.role === "admin") {
      return next(errorHandler(403, "Only the owning associate can reject this quotation"));
    }
    if (quotation.status !== "Sent") return next(errorHandler(400, "Only sent quotations can be rejected"));

    quotation.status = "Rejected";
    quotation.rejectionReason = rejectionReason;
    quotation.respondedAt = new Date();
    await quotation.save();

    await notifyAdmins({
      title: "Quotation rejected",
      message: `${quotation.customerName} rejected quotation ${quotation.quotationNumber}: ${rejectionReason}`,
      type: "Quotation Rejected",
      quotation: quotation._id,
    });

    res.status(200).json({ message: "Quotation rejected", quotation });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export const downloadQuotationPdf = async (req, res, next) => {
  try {
    const quotation = await populateQuotation(Quotation.findById(req.params.id));
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user)) return next(errorHandler(403, "Access denied"));
    streamQuotationPdf(res, quotation);
  } catch (error) {
    next(error);
  }
};

// Client copy — no commission column
export const downloadClientQuotationPdf = async (req, res, next) => {
  try {
    const quotation = await populateQuotation(Quotation.findById(req.params.id));
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user)) return next(errorHandler(403, "Access denied"));
    streamClientQuotationPdf(res, quotation);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Send client-facing quotation by email (no commission data)
// ---------------------------------------------------------------------------
export const sendQuotationToClient = async (req, res, next) => {
  try {
    const quotation = await populateQuotation(Quotation.findById(req.params.id));
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (!ensureQuotationAccess(quotation, req.user)) return next(errorHandler(403, "Access denied"));

    const recipientEmail = req.body.email || quotation.customerEmail;
    if (!recipientEmail) return next(errorHandler(400, "No client email address on record. Please provide one."));

    const html = buildClientQuotationHtml(quotation);
    const companyName = process.env.COMPANY_NAME || "Our Firm";

    await sendMail({
      to: recipientEmail,
      subject: `Quotation ${quotation.quotationNumber} from ${companyName}`,
      html: `
        <p>Dear ${quotation.customerName},</p>
        <p>Please find your quotation <strong>${quotation.quotationNumber}</strong> below.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <hr/>
        ${html}
        <hr/>
        <p style="color:#6b7280;font-size:12px">This quotation was sent by ${companyName}.</p>
      `,
    });

    // Record that it was sent to client
    quotation.clientEmailSentAt = new Date();
    await quotation.save();

    await notifyAdmins({
      title: "Quotation emailed to client",
      message: `Quotation ${quotation.quotationNumber} was emailed to ${recipientEmail} by ${req.user.name || "associate"}`,
      type: "Quotation Sent To Client",
      quotation: quotation._id,
    });

    res.status(200).json({ message: `Quotation emailed to ${recipientEmail}` });
  } catch (error) {
    next(error);
  }
};