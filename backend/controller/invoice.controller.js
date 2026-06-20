import Invoice, { INVOICE_STATUSES } from "../models/invoice.model.js";
import Payment from "../models/payment.model.js";
import { errorHandler } from "../utils/error.js";
import { notify } from "../utils/notify.js";
import { streamInvoicePdf } from "../utils/pdfGenerator.js";

const ensureInvoiceAccess = (invoice, user) => {
  if (user.role === "admin") return true;
  return String(invoice.associate?._id || invoice.associate) === user.id;
};

const populateInvoice = (query) =>
  query
    .populate("associate", "name email profileImageUrl")
    .populate("quotation", "quotationNumber");

export const listInvoices = async (req, res, next) => {
  try {
    const { invoiceStatus, search, from, to } = req.query;
    const filter = {};

    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (invoiceStatus && INVOICE_STATUSES.includes(invoiceStatus)) filter.invoiceStatus = invoiceStatus;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    if (search) {
      filter.$or = [
        { invoiceNumber: new RegExp(search, "i") },
        { customerName: new RegExp(search, "i") },
        { customerEmail: new RegExp(search, "i") },
      ];
    }

    const invoices = await populateInvoice(Invoice.find(filter)).sort({ createdAt: -1 });
    res.status(200).json({ invoices });
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await populateInvoice(Invoice.findById(req.params.id));
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (!ensureInvoiceAccess(invoice, req.user)) return next(errorHandler(403, "Access denied"));
    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
};

export const downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await populateInvoice(Invoice.findById(req.params.id));
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (!ensureInvoiceAccess(invoice, req.user)) return next(errorHandler(403, "Access denied"));
    const payments = await Payment.find({ invoice: invoice._id, status: "Verified" }).sort({ paymentDate: 1 });
    streamInvoicePdf(res, invoice, payments);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { dueDate, notes, terms } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Only admins can update invoices"));

    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;

    await invoice.save();
    res.status(200).json({ message: "Invoice updated", invoice });
  } catch (error) {
    next(error);
  }
};
