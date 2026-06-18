import Invoice, { INVOICE_STATUSES, PROJECT_STATUSES } from "../models/invoice.model.js";
import Payment from "../models/payment.model.js";
import ProjectTimeline from "../models/projectTimeline.model.js";
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
    .populate("quotation", "quotationNumber")
    .populate("assignedAdmin", "name email");

export const listInvoices = async (req, res, next) => {
  try {
    const { invoiceStatus, search, from, to, projectStatus } = req.query;
    const filter = {};

    if (req.user.role !== "admin") filter.associate = req.user.id;
    if (invoiceStatus && INVOICE_STATUSES.includes(invoiceStatus)) filter.invoiceStatus = invoiceStatus;
    if (projectStatus && PROJECT_STATUSES.includes(projectStatus)) filter.projectStatus = projectStatus;
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

export const updateProjectStatus = async (req, res, next) => {
  try {
    const { projectStatus, remark, startDate, expectedCompletionDate, actualCompletionDate, deadline, assignedAdmin } =
      req.body;

    if (!PROJECT_STATUSES.includes(projectStatus)) return next(errorHandler(400, "Invalid project status"));

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));

    const previousStatus = invoice.projectStatus;

    invoice.projectStatus = projectStatus;
    if (startDate) invoice.startDate = new Date(startDate);
    if (expectedCompletionDate) invoice.expectedCompletionDate = new Date(expectedCompletionDate);
    if (actualCompletionDate) invoice.actualCompletionDate = new Date(actualCompletionDate);
    if (deadline) invoice.deadline = new Date(deadline);
    if (assignedAdmin) invoice.assignedAdmin = assignedAdmin;

    if (projectStatus === "Completed") {
      invoice.invoiceStatus = invoice.balanceDue <= 0 ? "Paid" : "Partially Paid";
    }

    await invoice.save();

    await ProjectTimeline.create({
      invoice: invoice._id,
      previousStatus,
      newStatus: projectStatus,
      remark: remark || undefined,
      updatedBy: req.user.id,
    });

    await notify({
      user: invoice.associate,
      title: `Project status: ${projectStatus}`,
      message: remark || `Your project for ${invoice.customerName} has been moved to: ${projectStatus}`,
      type: "Work Status Changed",
      invoice: invoice._id,
    });

    res.status(200).json({ message: "Project status updated", invoice });
  } catch (error) {
    next(error);
  }
};

export const getProjectTimeline = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (!ensureInvoiceAccess(invoice, req.user)) return next(errorHandler(403, "Access denied"));

    const timeline = await ProjectTimeline.find({ invoice: invoice._id })
      .populate("updatedBy", "name role")
      .sort({ timestamp: 1 });

    res.status(200).json({ timeline });
  } catch (error) {
    next(error);
  }
};
