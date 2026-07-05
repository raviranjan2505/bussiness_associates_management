import Invoice, { INVOICE_STATUSES } from "../models/invoice.model.js";
import Payment from "../models/payment.model.js";
import { errorHandler } from "../utils/error.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { streamInvoicePdf, streamClientInvoicePdf, buildClientInvoiceHtml } from "../utils/pdfGenerator.js";
import { sendMail } from "../utils/mailer.js";

const ensureInvoiceAccess = (invoice, user) => {
  if (user.role === "admin") return true;
  return String(invoice.associate?._id || invoice.associate) === user.id;
};

const populateInvoice = (query) =>
  query
    .populate("associate", "name email profileImageUrl")
    .populate("quotation", "quotationNumber");

// Shared by listInvoices and getInvoiceSummary so the date range applied to
// the table and to the summary cards always stays perfectly in sync.
const buildInvoiceBaseFilter = (req) => {
  const { from, to } = req.query;
  const filter = {};

  if (req.user.role !== "admin") filter.associate = req.user.id;
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = new Date(from);
  if (to) filter.createdAt.$lte = new Date(to);

  return filter;
};

export const listInvoices = async (req, res, next) => {
  try {
    const { invoiceStatus, search } = req.query;
    const filter = buildInvoiceBaseFilter(req);

    if (invoiceStatus && INVOICE_STATUSES.includes(invoiceStatus)) filter.invoiceStatus = invoiceStatus;
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

// Summary cards for the Admin Invoices page (Total / Paid / Partially Paid /
// Pending). Only the date range (from/to) affects this — search and status
// filters on the list stay independent, exactly as before.
export const getInvoiceSummary = async (req, res, next) => {
  try {
    const filter = buildInvoiceBaseFilter(req);

    const [totalInvoices, paidInvoices, partiallyPaidInvoices, pendingInvoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.countDocuments({ ...filter, invoiceStatus: "Paid" }),
      Invoice.countDocuments({ ...filter, invoiceStatus: "Partially Paid" }),
      Invoice.countDocuments({
        ...filter,
        invoiceStatus: { $in: ["Generated", "Waiting For Payment", "Overdue"] },
      }),
    ]);

    res.status(200).json({
      summary: { totalInvoices, paidInvoices, partiallyPaidInvoices, pendingInvoices },
    });
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

// Client copy — no commission
export const downloadClientInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await populateInvoice(Invoice.findById(req.params.id));
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (!ensureInvoiceAccess(invoice, req.user)) return next(errorHandler(403, "Access denied"));
    const payments = await Payment.find({ invoice: invoice._id, status: "Verified" }).sort({ paymentDate: 1 });
    streamClientInvoicePdf(res, invoice, payments);
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

// ---------------------------------------------------------------------------
// Send client-facing invoice by email (no commission data)
// ---------------------------------------------------------------------------
export const sendInvoiceToClient = async (req, res, next) => {
  try {
    const invoice = await populateInvoice(Invoice.findById(req.params.id));
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (!ensureInvoiceAccess(invoice, req.user)) return next(errorHandler(403, "Access denied"));

    const recipientEmail = req.body.email || invoice.customerEmail;
    if (!recipientEmail) return next(errorHandler(400, "No client email address on record. Please provide one."));

    const payments = await Payment.find({ invoice: invoice._id, status: "Verified" }).sort({ paymentDate: 1 });
    const html = buildClientInvoiceHtml(invoice, payments);
    const companyName = process.env.COMPANY_NAME || "Our Firm";

    await sendMail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
      html: `
        <p>Dear ${invoice.customerName},</p>
        <p>Please find your invoice <strong>${invoice.invoiceNumber}</strong> below.</p>
        <p>Total Amount Due: <strong>Rs. ${Number(invoice.balanceDue || 0).toFixed(2)}</strong></p>
        <hr/>
        ${html}
        <hr/>
        <p style="color:#6b7280;font-size:12px">This invoice was sent by ${companyName}.</p>
      `,
    });

    invoice.clientEmailSentAt = new Date();
    await invoice.save();

    await notifyAdmins({
      title: "Invoice emailed to client",
      message: `Invoice ${invoice.invoiceNumber} was emailed to ${recipientEmail} by ${req.user.name || "associate"}`,
      type: "Invoice Sent To Client",
      invoice: invoice._id,
    });

    res.status(200).json({ message: `Invoice emailed to ${recipientEmail}` });
  } catch (error) {
    next(error);
  }
};
// ── Cancel Invoice (admin only) ────────────────────────────────────────────
export const cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await populateInvoice(Invoice.findById(req.params.id));
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (req.user.role !== "admin") return next(errorHandler(403, "Only admins can cancel invoices"));
    if (invoice.invoiceStatus === "Cancelled") {
      return next(errorHandler(400, "Invoice is already cancelled"));
    }
    if (invoice.invoiceStatus === "Paid") {
      return next(errorHandler(400, "A fully paid invoice cannot be cancelled"));
    }

    const previousStatus = invoice.invoiceStatus;
    invoice.invoiceStatus = "Cancelled";
    await invoice.save();

    // Notify the associate
    await notify({
      user: invoice.associate,
      title: "Invoice cancelled",
      message: `Invoice ${invoice.invoiceNumber} has been cancelled by admin`,
      type: "Invoice Cancelled",
      invoice: invoice._id,
    });

    res.status(200).json({ message: "Invoice cancelled", invoice });
  } catch (error) {
    next(error);
  }
};