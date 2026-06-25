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
import { streamQuotationPdf } from "../utils/pdfGenerator.js";

const ensureQuotationAccess = (quotation, user) => {
  if (user.role === "admin") return true;
  return String(quotation.associate?._id || quotation.associate) === user.id;
};

const populateQuotation = (query) =>
  query.populate("associate", "name email profileImageUrl").populate("services.service", "name price");

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

      quotationServices = leads.map((lead) => {
        const servicePrice = lead.servicePrice ?? lead.service?.price ?? 0;
        return {
          service: lead.service?._id,
          name: lead.service?.name || `Lead ${lead.leadId}`,
          description: `Lead ${lead.leadId}`,
          price: Number(servicePrice),
          quantity: 1,
          amount: Number(servicePrice),
          associateEarningPercent: lead.associateEarningPercent || 0,
          associateEarningAmount: lead.associateEarningAmount || 0,
        };
      });

      quotationLeadIds = leads.map((lead) => lead._id);
      if (leads.length === 1) quotationLeadId = leads[0]._id;

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
      const leads = await Lead.find({ _id: { $in: uniqueLeadIds } }).populate(
        "service",
        "name price associateEarningPercent associateEarningAmount"
      );
      if (leads.length !== uniqueLeadIds.length) return next(errorHandler(404, "One or more linked leads were not found"));

      const serviceMap = new Map();
      (quotation.services || []).forEach((service, index) => {
        const leadId = quoteLeadIds[index];
        if (leadId) serviceMap.set(String(leadId), service);
      });

      for (const lead of leads) {
        const leadService = serviceMap.get(String(lead._id));
        const line = leadService || {
          service: lead.service?._id,
          name: lead.service?.name || `Lead ${lead.leadId}`,
          description: `Lead ${lead.leadId}`,
          price: Number(lead.servicePrice ?? lead.service?.price ?? 0),
          quantity: 1,
          amount: Number(lead.servicePrice ?? lead.service?.price ?? 0),
          associateEarningPercent: lead.associateEarningPercent || 0,
          associateEarningAmount: lead.associateEarningAmount || 0,
        };

        const invoiceDiscount = { ...quotation.discount };
        if (quotation.discount?.type === "flat") {
          const totalDiscount = quotation.discount.amount ?? quotation.discount.value ?? 0;
          invoiceDiscount.amount = Number(
            ((line.amount / Math.max(quotation.subtotal, 1)) * totalDiscount).toFixed(2)
          );
        } else if (quotation.discount?.type === "percentage") {
          invoiceDiscount.amount = Number(((line.amount * (quotation.discount.value || 0)) / 100).toFixed(2));
        }

        const subtotal = Number(line.amount || 0);
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
          services: [line],
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

        if (work) {
          work.invoiceId = invoice._id;
          await work.save();
        }

        if (!lead.invoiceId) {
          lead.invoiceId = invoice._id;
          await lead.save();
        }

        createdWorks.push(work);
        createdInvoices.push(invoice);
      }
    }

    await notify({
      user: quotation.associate,
      title: "Invoice generated",
      message: `Invoice(s) generated for accepted quotation ${quotation.quotationNumber}`,
      type: "Invoice Generated",
      invoice: createdInvoices.map((inv) => inv._id),
    });

    await notifyAdmins({
      title: "Quotation accepted",
      message: `${quotation.customerName} accepted quotation ${quotation.quotationNumber}. Invoice(s) generated.`,
      type: "Quotation Accepted",
      quotation: quotation._id,
    });

    res.status(200).json({
      message: "Quotation accepted, work and invoice records created",
      quotation,
      works: createdWorks,
      invoices: createdInvoices,
      invoice: createdInvoices.length === 1 ? createdInvoices[0] : createdInvoices[0] || null,
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
