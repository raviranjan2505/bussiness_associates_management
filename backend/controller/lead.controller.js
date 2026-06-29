import mongoose from "mongoose";
import Lead from "../models/lead.model.js";
import Quotation from "../models/quotation.model.js";
import Invoice from "../models/invoice.model.js";
import Payment from "../models/payment.model.js";
import Client from "../models/client.model.js";
import { errorHandler } from "../utils/error.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { generateSequenceNumber } from "../utils/sequence.js";
import { streamInvoicePdf } from "../utils/pdfGenerator.js";

const ensureLeadAccess = (lead, user) => {
  if (user.role === "admin") return true;
  return String(lead.associate?._id || lead.associate) === user.id;
};

export const listLeads = async (req, res, next) => {
  try {
    const { search, status, from, to, associate, clientId } = req.query;
    const filter = { isConverted: false };

    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (status) filter.leadStatus = status;
    if (associate && req.user.role === "admin") filter.associate = associate;
    if (clientId) {
      if (!mongoose.isValidObjectId(clientId)) return next(errorHandler(400, "Invalid client identifier"));
      filter.clientId = clientId;
    }
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    if (search) {
      filter.$or = [
        { leadId: new RegExp(search, "i") },
        { "clientDetails.clientName": new RegExp(search, "i") },
        { "clientDetails.mobileNumber": new RegExp(search, "i") },
      ];
    }

    const leads = await Lead.find(filter)
      .populate("associate", "name email profileImageUrl")
      .populate("division", "name")
      .populate("service", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json({ leads });
  } catch (error) {
    next(error);
  }
};

export const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("associate", "name email profileImageUrl")
      .populate("division", "name")
      .populate("service", "name price")
      .populate("quotationId", "quotationNumber status")
      .populate("invoiceId", "invoiceNumber invoiceStatus amountPaid balanceDue")
      .populate("paymentId", "amount status paymentDate");
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (!ensureLeadAccess(lead, req.user)) return next(errorHandler(403, "Access denied"));
    res.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
};

export const viewLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));

    const previousStatus = lead.leadStatus;
    lead.adminViewed = true;
    lead.viewedAt = new Date();
    lead.leadStatus = lead.leadStatus === "Submitted" ? "Seen By Admin" : lead.leadStatus;
    lead.statusHistory.push({
      previousStatus,
      newStatus: lead.leadStatus,
      reason: "Admin viewed lead",
      remark: "Lead marked as seen by admin",
      updatedBy: req.user.id,
    });
    lead.auditLogs.push({
      actionType: "Lead Viewed",
      description: "Admin viewed the lead",
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
    });
    await lead.save();

    res.status(200).json({ message: "Lead marked as viewed", lead });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req, res, next) => {
  try {
    const { leadStatus, expectedCompletionDate, remarks } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));

    const previousStatus = lead.leadStatus;
    if (leadStatus) lead.leadStatus = leadStatus;
    if (expectedCompletionDate !== undefined) lead.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : undefined;
    if (remarks !== undefined) lead.remarks = remarks;
    lead.statusHistory.push({
      previousStatus,
      newStatus: lead.leadStatus,
      reason: "Lead details updated",
      remark: remarks || "Lead status updated",
      updatedBy: req.user.id,
    });
    lead.auditLogs.push({
      actionType: "Lead Updated",
      description: "Lead status or details updated",
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
    });

    await lead.save();
    res.status(200).json({ message: "Lead updated", lead });
  } catch (error) {
    next(error);
  }
};

export const createLeadQuotation = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("associate", "name email");
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    if (lead.quotationId) return next(errorHandler(400, "A quotation already exists for this lead"));

    const { notes, terms, discount, tax, validUntil } = req.body;

    // Build service lines from the embedded services[] array (multi-service lead)
    // or fall back to legacy single-service fields
    let quotationServices;
    if (Array.isArray(lead.services) && lead.services.length > 0) {
      quotationServices = lead.services.map((svc) => ({
        service: svc.service,
        name: svc.name,
        description: svc.description || `Lead ${lead.leadId} — ${svc.name}`,
        price: Number(svc.price || 0),
        quantity: Number(svc.quantity || 1),
        amount: Number(svc.amount || svc.price || 0),
        associateEarningPercent: svc.associateEarningPercent ?? lead.associateEarningPercent ?? 0,
        associateEarningAmount: svc.associateEarningAmount ?? 0,
      }));
    } else {
      // Legacy single-service lead — use body services if provided, else derive from lead
      const { services } = req.body;
      if (Array.isArray(services) && services.length) {
        quotationServices = services.map((service) => ({
          ...service,
          associateEarningPercent: service.associateEarningPercent ?? lead.associateEarningPercent,
          associateEarningAmount: service.associateEarningAmount ?? lead.associateEarningAmount,
        }));
      } else {
        const servicePrice = lead.servicePrice || 0;
        quotationServices = [
          {
            service: lead.service,
            name: lead.title || `Lead ${lead.leadId}`,
            description: `Lead ${lead.leadId}`,
            price: servicePrice,
            quantity: 1,
            amount: servicePrice,
            associateEarningPercent: lead.associateEarningPercent || 0,
            associateEarningAmount: lead.associateEarningAmount || 0,
          },
        ];
      }
    }

    if (!quotationServices.length) {
      return next(errorHandler(400, "At least one service is required"));
    }

    const quotationNumber = await generateSequenceNumber(Quotation, "QUO");

    const quotation = new Quotation({
      quotationNumber,
      associate: lead.associate,
      leadId: lead._id,
      // serviceLeadIds[i] = lead._id for every service line — so acceptQuotation
      // knows all services belong to this single lead.
      serviceLeadIds: quotationServices.map(() => lead._id),
      client: lead.clientId,
      customerName: lead.clientDetails.clientName,
      customerEmail: lead.clientDetails.email,
      customerPhone: lead.clientDetails.mobileNumber,
      services: quotationServices,
      discount: discount || undefined,
      tax: tax || undefined,
      notes,
      terms,
      validUntil,
      status: "Draft",
      createdBy: req.user.id,
    });

    await quotation.save();
    lead.quotationId = quotation._id;
    lead.auditLogs.push({
      actionType: "Quotation Created",
      description: `Quotation ${quotation.quotationNumber} created for lead`,
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
    });
    if (lead.leadStatus === "Submitted") {
      lead.leadStatus = "Seen By Admin";
      lead.statusHistory.push({
        previousStatus: "Submitted",
        newStatus: "Seen By Admin",
        reason: "Quotation created",
        remark: "Admin created a quotation for the lead",
        updatedBy: req.user.id,
      });
    }
    await lead.save();

    await notify({
      user: lead.associate,
      title: "Quotation created",
      message: `A quotation has been created for lead ${lead.leadId}`,
      type: "Quotation Created",
      lead: lead._id,
      quotation: quotation._id,
    });

    res.status(201).json({ message: "Quotation created for lead", quotation, lead });
  } catch (error) {
    next(error);
  }
};

export const createLeadInvoice = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    if (!lead.quotationId) return next(errorHandler(400, "Lead does not have a quotation"));

    const quotation = await Quotation.findById(lead.quotationId);
    if (!quotation) return next(errorHandler(404, "Quotation not found"));
    if (quotation.status !== "Accepted") return next(errorHandler(400, "Invoice can only be generated from an accepted quotation"));
    if (lead.invoiceId) {
      const existingInvoice = await Invoice.findById(lead.invoiceId);
      if (existingInvoice) return res.status(200).json({ message: "Invoice already exists", invoice: existingInvoice });
    }

    const invoiceNumber = await generateSequenceNumber(Invoice, "INV");
    const invoice = await Invoice.create({
      invoiceNumber,
      quotation: quotation._id,
      leadId: lead._id,
      associate: quotation.associate,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      services: quotation.services,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      tax: quotation.tax,
      totalAmount: quotation.totalAmount,
      amountPaid: 0,
      balanceDue: quotation.totalAmount,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      invoiceStatus: "Waiting For Payment",
      notes: quotation.notes,
      terms: quotation.terms,
      createdBy: req.user.id,
    });

    lead.invoiceId = invoice._id;
    lead.auditLogs.push({
      actionType: "Invoice Generated",
      description: `Invoice ${invoice.invoiceNumber} generated for lead`,
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
    });
    await lead.save();

    await notify({
      user: lead.associate,
      title: "Invoice generated",
      message: `Invoice ${invoice.invoiceNumber} has been generated for your lead`,
      type: "Invoice Generated",
      lead: lead._id,
      invoice: invoice._id,
    });

    res.status(201).json({ message: "Invoice generated for lead", invoice, lead });
  } catch (error) {
    next(error);
  }
};

export const createLeadPayment = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return next(errorHandler(404, "Lead not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    if (!lead.invoiceId) return next(errorHandler(400, "Lead does not have an invoice"));

    const invoice = await Invoice.findById(lead.invoiceId);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));

    const { amount, paymentDate, paymentMethod, transactionId, remarks } = req.body;
    if (!amount || Number(amount) <= 0) return next(errorHandler(400, "A positive amount is required"));
    if (invoice.invoiceStatus === "Paid") return next(errorHandler(400, "Invoice is already paid"));
    if (invoice.invoiceStatus === "Cancelled") return next(errorHandler(400, "Invoice is cancelled"));

    const payment = await Payment.create({
      invoice: invoice._id,
      leadId: lead._id,
      amount: Number(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionId,
      remarks,
      status: "Pending",
      recordedBy: req.user.id,
    });

    if (!lead.paymentId) {
      lead.paymentId = payment._id;
      lead.auditLogs.push({
        actionType: "Payment Recorded",
        description: "Payment recorded against lead invoice",
        user: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
      });
      await lead.save();
    }

    await notify({
      user: lead.associate,
      title: "Payment requested",
      message: `A payment of Rs. ${payment.amount} has been recorded for lead ${lead.leadId}`,
      type: "Payment Recorded",
      lead: lead._id,
      payment: payment._id,
      invoice: invoice._id,
    });

    res.status(201).json({ message: "Payment recorded for lead", payment, lead });
  } catch (error) {
    next(error);
  }
};