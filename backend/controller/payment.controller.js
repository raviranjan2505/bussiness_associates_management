import mongoose from "mongoose";
import Payment, { PAYMENT_STATUSES, PAYMENT_METHODS } from "../models/payment.model.js";
import Invoice from "../models/invoice.model.js";
import User from "../models/user.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import PaymentSettings from "../models/paymentSettings.model.js";
import { errorHandler } from "../utils/error.js";
import { toMoney } from "../utils/money.js";
import { notify, notifyAdmins } from "../utils/notify.js";
import { streamReceiptPdf } from "../utils/pdfGenerator.js";
import { convertLeadIfPaid } from "../utils/leadConversion.js";

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Payment.find(filter) lets Mongoose auto-cast a string invoice id to an
// ObjectId, but Payment.aggregate([{ $match: filter }, ...]) does NOT —
// aggregation pipelines match raw BSON, so a string id would silently match
// zero documents against a field stored as ObjectId. Every place that
// aggregates on `filter` needs this cast version instead.
const toAggregateFilter = (filter) => {
  const out = { ...filter };
  if (out.invoice) {
    if (typeof out.invoice === "string" && mongoose.Types.ObjectId.isValid(out.invoice)) {
      out.invoice = new mongoose.Types.ObjectId(out.invoice);
    } else if (out.invoice.$in) {
      out.invoice = {
        $in: out.invoice.$in
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
  }
  return out;
};

const syncInvoicePaymentStatus = async (invoice, updatedBy) => {
  const payments = await Payment.find({ invoice: invoice._id, status: "Verified" });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  invoice.amountPaid = toMoney(totalPaid);
  invoice.balanceDue = toMoney(Math.max(invoice.totalAmount - totalPaid, 0));
  if (totalPaid <= 0) {
    invoice.invoiceStatus = "Waiting For Payment";
  } else if (invoice.balanceDue <= 0) {
    invoice.invoiceStatus = "Paid";
  } else {
    invoice.invoiceStatus = "Partially Paid";
  }
  await invoice.save();
  if (invoice.invoiceStatus === "Paid") await syncWorkStatusForPaidInvoice(invoice, updatedBy);
};

// When an invoice becomes fully paid, any Work Submission that was parked on
// "Waiting For Payment" specifically because of this invoice can move
// forward — other statuses (In Process, Completed, etc.) are left alone
// since those reflect progress the admin has already made manually.
const syncWorkStatusForPaidInvoice = async (invoice, updatedBy) => {
  const works = await WorkSubmission.find({ invoiceId: invoice._id, status: "Waiting For Payment" });
  for (const work of works) {
    work.statusHistory.push({
      previousStatus: work.status,
      newStatus: "Pending",
      remark: "Invoice fully paid — automatically moved out of Waiting For Payment.",
      updatedBy: updatedBy || work.associate,
    });
    work.status = "Pending";
    await work.save();
    await notify({
      user: work.associate,
      title: "Payment complete — work resumed",
      message: `Invoice ${invoice.invoiceNumber} is now fully paid. ${work.workId} has moved to Pending.`,
      type: "Status Updated",
      workSubmission: work._id,
      invoice: invoice._id,
    });
  }
};

export const addPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, transactionId, remarks } = req.body;
    if (!invoiceId) return next(errorHandler(400, "Invoice ID is required"));
    if (!amount || Number(amount) <= 0) return next(errorHandler(400, "A positive amount is required"));

    // Accept either the raw invoice _id or its human-readable invoice
    // number (e.g. "INV-2026-00008"), so admins can paste whichever one
    // they have on hand — same lookup style already used for the
    // Payments list search.
    const invoiceRef = String(invoiceId).trim();
    const invoice = /^[0-9a-fA-F]{24}$/.test(invoiceRef)
      ? await Invoice.findById(invoiceRef)
      : await Invoice.findOne({ invoiceNumber: new RegExp(`^${escapeRegex(invoiceRef)}$`, "i") });

    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (invoice.invoiceStatus === "Paid") return next(errorHandler(400, "Invoice is already paid"));
    if (invoice.invoiceStatus === "Cancelled") return next(errorHandler(400, "Invoice is cancelled"));

    const payment = await Payment.create({
      invoice: invoice._id,
      leadId: invoice.leadId,
      amount: toMoney(Number(amount)),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionId,
      remarks,
      status: "Pending",
      recordedBy: req.user.id,
    });

    await notify({
      user: invoice.associate,
      title: "Payment recorded",
      message: `A payment of Rs. ${payment.amount} has been recorded for invoice ${invoice.invoiceNumber}`,
      type: "Payment Updated",
      invoice: invoice._id,
      payment: payment._id,
    });

    res.status(201).json({ message: "Payment recorded", payment });
  } catch (error) {
    next(error);
  }
};

export const listPayments = async (req, res, next) => {
  try {
    const { invoiceId, search, status, from, to } = req.query;
    const filter = {};
    // Exact-match deep link (e.g. "Manage Payments" from the Invoice Detail
    // page) — kept exactly as before.
    if (invoiceId) filter.invoice = invoiceId;

    // Free-text search across invoice number, client name, and associate
    // name — resolves to the matching invoices first, then filters payments
    // by those invoice ids.
    if (search) {
      const term = new RegExp(escapeRegex(search), "i");
      const matchingAssociateIds = await User.find({ name: term }).distinct("_id");
      const matchingInvoiceIds = await Invoice.find({
        $or: [
          { invoiceNumber: term },
          { customerName: term },
          ...(matchingAssociateIds.length ? [{ associate: { $in: matchingAssociateIds } }] : []),
        ],
      }).distinct("_id");
      filter.invoice = matchingInvoiceIds.length ? { $in: matchingInvoiceIds } : "__none__";
    }

    if (status) filter.status = status;

    // Date range filter on paymentDate
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to)   filter.paymentDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    if (req.user.role !== "admin") {
      const myInvoiceIds = await Invoice.find({ associate: req.user.id }).distinct("_id");
      if (filter.invoice && filter.invoice.$in) {
        // Intersect the search results with the associate's own invoices
        const mine = new Set(myInvoiceIds.map(String));
        filter.invoice = { $in: filter.invoice.$in.filter((i) => mine.has(String(i))) };
      } else {
        filter.invoice = invoiceId
          ? myInvoiceIds.some((id) => String(id) === invoiceId) ? invoiceId : "__none__"
          : { $in: myInvoiceIds };
      }
    }

    // Summary totals — computed server-side so the frontend never has to
    // aggregate across pages or re-derive from filtered/paginated results.
    // "Due" = balanceDue on invoices whose payments match the current filter.
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // For admin: summary is across all matching payments
    // For associate: summary is scoped to their own invoices (already in filter)
    const aggFilter = toAggregateFilter(filter);
    const [
      paidAgg,      // Total Paid Amount (filtered)
      todayPaidAgg, // Today's Paid Amount
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { ...aggFilter, status: "Verified" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { ...aggFilter, status: "Verified", paymentDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    // Due Amount — sum of balanceDue on invoices associated with the filtered payments
    // We derive the relevant invoice IDs from the filtered payment set for accuracy.
    const filteredInvoiceIds = await Payment.find(filter).distinct("invoice");
    const [dueAgg, todayDueAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { _id: { $in: filteredInvoiceIds }, balanceDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]),
      // Today's Due = invoices in the current filter that have a payment today
      // and still have an outstanding balance.
      Invoice.aggregate([
        {
          $match: {
            _id: { $in: filteredInvoiceIds },
            balanceDue: { $gt: 0 },
          },
        },
        {
          $lookup: {
            from: "payments",
            let: { invId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$invoice", "$$invId"] },
                  paymentDate: { $gte: todayStart, $lte: todayEnd },
                  status: "Verified",
                },
              },
            ],
            as: "todayPayments",
          },
        },
        { $match: { "todayPayments.0": { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]),
    ]);

    const summary = {
      totalPaid:    paidAgg[0]?.total      || 0,
      totalDue:     dueAgg[0]?.total       || 0,
      todayPaid:    todayPaidAgg[0]?.total || 0,
      todayDue:     todayDueAgg[0]?.total  || 0,
    };

    const payments = await Payment.find(filter)
      .populate("recordedBy", "name")
      .populate("verifiedBy", "name")
      .populate({
        path: "invoice",
        select: "invoiceNumber customerName totalAmount amountPaid balanceDue services associate",
        populate: { path: "associate", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ payments, summary });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(errorHandler(404, "Payment not found"));
    if (payment.status === "Verified") return next(errorHandler(400, "Already verified"));

    payment.status = "Verified";
    payment.verifiedBy = req.user.id;
    payment.verifiedAt = new Date();
    await payment.save();

    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) {
      await syncInvoicePaymentStatus(invoice, req.user.id);
      await notify({
        user: invoice.associate,
        title: "Payment verified",
        message: `Payment of Rs. ${payment.amount} for invoice ${invoice.invoiceNumber} verified`,
        type: "Payment Updated",
        invoice: invoice._id,
        payment: payment._id,
      });
      await convertLeadIfPaid(invoice);
    }
    res.status(200).json({ message: "Payment verified", payment });
  } catch (error) {
    next(error);
  }
};

export const failPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(errorHandler(404, "Payment not found"));
    if (payment.status !== "Pending") return next(errorHandler(400, "Only pending payments can be failed"));

    payment.status = "Failed";
    await payment.save();

    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) await syncInvoicePaymentStatus(invoice, req.user.id);

    res.status(200).json({ message: "Payment marked as failed", payment });
  } catch (error) {
    next(error);
  }
};

export const markInvoicePaid = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));

    invoice.invoiceStatus = "Paid";
    invoice.amountPaid = invoice.totalAmount;
    invoice.balanceDue = 0;
    await invoice.save();
    await syncWorkStatusForPaidInvoice(invoice, req.user.id);

    await notify({
      user: invoice.associate,
      title: "Invoice marked as paid",
      message: `Invoice ${invoice.invoiceNumber} marked as fully paid`,
      type: "Payment Updated",
      invoice: invoice._id,
    });

    await convertLeadIfPaid(invoice);

    res.status(200).json({ message: "Invoice marked as paid", invoice });
  } catch (error) {
    next(error);
  }
};

export const downloadReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(errorHandler(404, "Payment not found"));

    const invoice = await Invoice.findById(payment.invoice).populate("associate", "name email");
    if (!invoice) return next(errorHandler(404, "Invoice not found"));

    if (req.user.role !== "admin" && String(invoice.associate?._id) !== req.user.id) {
      return next(errorHandler(403, "Access denied"));
    }

    streamReceiptPdf(res, payment, invoice);
  } catch (error) {
    next(error);
  }
};

// ── Associate self-service payment (Work Details page) ─────────────────────
// Lets an associate submit a full or partial payment against the invoice
// linked to one of their own work items, with optional proof (already
// uploaded via the existing Additional Documents endpoint — this just
// records the resulting URL for quick reference during verification).
// Reuses the same Payment collection and the same Pending → admin
// Verify/Fail flow already built for admin-recorded payments — no new
// payment record type, no duplicate invoice.
export const submitAssociatePayment = async (req, res, next) => {
  try {
    const { workId, amount, paymentMethod, transactionId, remarks, proofUrl } = req.body;
    if (!workId) return next(errorHandler(400, "Work ID is required"));
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return next(errorHandler(400, "A positive amount is required"));

    const work = await WorkSubmission.findById(workId);
    if (!work) return next(errorHandler(404, "Work not found"));
    if (String(work.associate) !== req.user.id) {
      return next(errorHandler(403, "You can only submit payments for your own work"));
    }
    if (!work.invoiceId) return next(errorHandler(400, "No invoice has been generated for this work yet"));

    const invoice = await Invoice.findById(work.invoiceId);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (invoice.invoiceStatus === "Paid") return next(errorHandler(400, "This invoice is already fully paid"));
    if (invoice.invoiceStatus === "Cancelled") return next(errorHandler(400, "This invoice has been cancelled"));
    if (numericAmount > invoice.balanceDue) {
      return next(errorHandler(400, `Amount cannot exceed the remaining due amount of Rs. ${invoice.balanceDue}`));
    }

    const payment = await Payment.create({
      invoice: invoice._id,
      work: work._id,
      leadId: invoice.leadId,
      proofUrl: proofUrl || undefined,
      amount: toMoney(numericAmount),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionId,
      remarks,
      status: "Pending",
      recordedBy: req.user.id,
    });

    const associateUser = await User.findById(req.user.id).select("name");

    await notifyAdmins({
      title: "Payment submitted for verification",
      message: `${associateUser?.name || "An associate"} submitted a payment of Rs. ${payment.amount} for invoice ${invoice.invoiceNumber} (${work.workId}). Verification pending.`,
      type: "Payment Recorded",
      invoice: invoice._id,
      workSubmission: work._id,
      payment: payment._id,
    });

    res.status(201).json({ message: "Payment submitted for verification", payment });
  } catch (error) {
    next(error);
  }
};

// ── Admin Payment Settings (shown to every associate on Work Details) ──────
export const getPaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSettings.findOne({ singletonKey: "payment_settings" });
    res.status(200).json({
      settings: settings || {
        bankName: "", accountHolderName: "", accountNumber: "",
        ifscCode: "", upiId: "", qrCodeUrl: "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentSettings = async (req, res, next) => {
  try {
    const { bankName, accountHolderName, accountNumber, ifscCode, upiId } = req.body;
    const update = {
      bankName, accountHolderName, accountNumber, ifscCode, upiId,
      updatedBy: req.user.id,
    };
    if (req.file) {
      update.qrCodeUrl = `${req.protocol}://${req.get("host")}/uploads/images/${req.file.filename}`;
    }

    const settings = await PaymentSettings.findOneAndUpdate(
      { singletonKey: "payment_settings" },
      { $set: update, $setOnInsert: { singletonKey: "payment_settings" } },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Payment settings updated", settings });
  } catch (error) {
    next(error);
  }
};