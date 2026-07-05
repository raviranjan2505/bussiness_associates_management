import Payment, { PAYMENT_STATUSES, PAYMENT_METHODS } from "../models/payment.model.js";
import Invoice from "../models/invoice.model.js";
import { errorHandler } from "../utils/error.js";
import { toMoney } from "../utils/money.js";
import { notify } from "../utils/notify.js";
import { streamReceiptPdf } from "../utils/pdfGenerator.js";
import { convertLeadIfPaid } from "../utils/leadConversion.js";

const syncInvoicePaymentStatus = async (invoice) => {
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
};

export const addPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, transactionId, remarks } = req.body;
    if (!invoiceId) return next(errorHandler(400, "Invoice ID is required"));
    if (!amount || Number(amount) <= 0) return next(errorHandler(400, "A positive amount is required"));

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return next(errorHandler(404, "Invoice not found"));
    if (invoice.invoiceStatus === "Paid") return next(errorHandler(400, "Invoice is already paid"));
    if (invoice.invoiceStatus === "Cancelled") return next(errorHandler(400, "Invoice is cancelled"));

    const payment = await Payment.create({
      invoice: invoiceId,
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
    const { invoiceId, from, to } = req.query;
    const filter = {};
    if (invoiceId) filter.invoice = invoiceId;

    // Date range filter on paymentDate
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to)   filter.paymentDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    if (req.user.role !== "admin") {
      const myInvoiceIds = await Invoice.find({ associate: req.user.id }).distinct("_id");
      filter.invoice = invoiceId
        ? myInvoiceIds.some((id) => String(id) === invoiceId) ? invoiceId : "__none__"
        : { $in: myInvoiceIds };
    }

    // Summary totals — computed server-side so the frontend never has to
    // aggregate across pages or re-derive from filtered/paginated results.
    // "Due" = balanceDue on invoices whose payments match the current filter.
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // For admin: summary is across all matching payments
    // For associate: summary is scoped to their own invoices (already in filter)
    const [
      paidAgg,      // Total Paid Amount (filtered)
      todayPaidAgg, // Today's Paid Amount
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { ...filter, status: "Verified" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { ...filter, status: "Verified", paymentDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    // Due Amount — sum of balanceDue on invoices associated with the filtered payments
    // We derive the relevant invoice IDs from the filtered payment set for accuracy.
    const filteredPayments = await Payment.find(filter).distinct("invoice");
    const [dueAgg, todayDueAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { _id: { $in: filteredPayments }, balanceDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]),
      // Today's Due = invoices where the most recent payment for that invoice
      // was today and balance is still outstanding
      Invoice.aggregate([
        {
          $lookup: {
            from: "payments",
            let: { invId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$invoice", "$$invId"] },
                  paymentDate: { $gte: todayStart, $lte: todayEnd } } },
            ],
            as: "todayPayments",
          },
        },
        { $match: { "todayPayments.0": { $exists: true }, balanceDue: { $gt: 0 } } },
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
      .populate("invoice", "invoiceNumber customerName totalAmount amountPaid balanceDue services")
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
      await syncInvoicePaymentStatus(invoice);
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
    if (invoice) await syncInvoicePaymentStatus(invoice);

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