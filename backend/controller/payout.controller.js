import mongoose from "mongoose";
import Invoice from "../models/invoice.model.js";
import Payment from "../models/payment.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import User from "../models/user.model.js";
import Payout, { PAYOUT_STATUSES } from "../models/payout.model.js";
import { errorHandler } from "../utils/error.js";
import { getTotalCommission, getCommissionByAssociate, getCommissionByClient } from "../utils/commission.js";

const toOid = (id) => new mongoose.Types.ObjectId(id);

// ── Lazy-sync: ensure a Payout record exists for every paid invoice ────────
// Called before any read that needs payout data. Safe to call multiple times —
// the unique index on invoice guarantees no duplicates.
//
// NOTE: associateEarningAmount lives on WorkSubmission, not on Invoice — a
// Payout's amount must always be sourced from the linked WorkSubmission.
// Older records created before this fix may still hold a stale 0, so
// existing Pending payouts are corrected here too.
const syncPayouts = async (associateId) => {
  const paidInvoices = await Invoice.find({
    associate: associateId,
    invoiceStatus: { $in: ["Paid", "Partially Paid"] },
  }).select("_id associate customerName").lean();

  for (const inv of paidInvoices) {
    const [existing, work, latestPayment] = await Promise.all([
      Payout.findOne({ invoice: inv._id }),
      WorkSubmission.findOne({ invoiceId: inv._id }).select("_id associateEarningAmount").lean(),
      Payment.findOne({ invoice: inv._id, status: "Verified" })
        .sort({ verifiedAt: -1 }).select("_id").lean(),
    ]);

    const correctAmount = work?.associateEarningAmount || 0;

    if (!existing) {
      await Payout.create({
        associate:    inv.associate,
        work:         work?._id,
        invoice:      inv._id,
        payment:      latestPayment?._id,
        clientName:   inv.customerName,
        payoutAmount: correctAmount,
        status:       "Pending",
      }).catch(() => {}); // ignore duplicate key errors
    } else if (existing.status !== "Paid" && existing.payoutAmount !== correctAmount) {
      // Self-heal a stale/zero amount recorded before this fix.
      existing.payoutAmount = correctAmount;
      if (!existing.work && work?._id) existing.work = work._id;
      await existing.save();
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN — Income summary grouped by associate
// ─────────────────────────────────────────────────────────────────────────────
export const listIncomeByAssociate = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));

    const { search, from, to, payoutStatus } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));

    // Verified payments → group by invoice's associate
    const paymentPipeline = [
      { $match: { status: "Verified", ...(Object.keys(dateFilter).length ? { paymentDate: dateFilter } : {}) } },
      { $lookup: { from: "invoices", localField: "invoice", foreignField: "_id", as: "inv" } },
      { $unwind: "$inv" },
      {
        $group: {
          _id:         "$inv.associate",
          totalIncome: { $sum: "$amount" },
          clientNames: { $addToSet: "$inv.customerName" },
        },
      },
    ];

    const paymentGroups = await Payment.aggregate(paymentPipeline);

    // Total Commission — sourced from completed WorkSubmissions, independent
    // of invoice/payment status, so it's fetched before we decide which
    // associate IDs to load (an associate may have commission with no
    // verified payment yet).
    const [commissionByAssociate, totalCommission] = await Promise.all([
      getCommissionByAssociate(),
      getTotalCommission(),
    ]);

    const associateIds = Array.from(new Set([
      ...paymentGroups.map((g) => String(g._id)),
      ...commissionByAssociate.keys(),
    ])).map((id) => toOid(id));

    const [payoutGroups, associates] = await Promise.all([
      Payout.aggregate([
        { $match: { associate: { $in: associateIds } } },
        {
          $group: {
            _id:          "$associate",
            totalPayout:  { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$payoutAmount", 0] } },
            pendingPayout:{ $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$payoutAmount", 0] } },
          },
        },
      ]),
      User.find({ _id: { $in: associateIds }, role: "associate" })
        .select("name email mobileNumber").lean(),
    ]);

    const payoutMap    = new Map(payoutGroups.map((p) => [String(p._id), p]));
    const associateMap = new Map(associates.map((a) => [String(a._id), a]));

    // Merge associates who have verified payments with associates who have
    // completed work but no verified payment yet, so their commission is
    // never hidden just because an invoice hasn't been paid/verified.
    const rowMap = new Map();
    for (const g of paymentGroups) {
      if (!associateMap.has(String(g._id))) continue;
      rowMap.set(String(g._id), {
        associateId:   g._id,
        totalClients:  g.clientNames.length,
        totalIncome:   g.totalIncome,
      });
    }
    for (const associateIdKey of commissionByAssociate.keys()) {
      if (!rowMap.has(associateIdKey) && associateMap.has(associateIdKey)) {
        rowMap.set(associateIdKey, { associateId: associateIdKey, totalClients: 0, totalIncome: 0 });
      }
    }

    let result = Array.from(rowMap.values()).map((g) => {
      const key = String(g.associateId);
      const a  = associateMap.get(key);
      const po = payoutMap.get(key) || { totalPayout: 0 };
      const totalCommissionForAssociate = commissionByAssociate.get(key) || 0;
      const totalPayout                 = po.totalPayout || 0;
      return {
        associateId:      g.associateId,
        associateName:    a.name,
        associateEmail:   a.email,
        totalClients:     g.totalClients,
        totalIncome:      g.totalIncome,
        totalCommission:  totalCommissionForAssociate,
        totalPayout,
        // Withdrawal Amount = commission earned so far minus what's already
        // been paid out — never derived from Payout status flags alone.
        pendingPayout: Math.max(totalCommissionForAssociate - totalPayout, 0),
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);

    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) =>
        `${r.associateName} ${r.associateEmail}`.toLowerCase().includes(q)
      );
    }
    if (payoutStatus === "Pending") result = result.filter((r) => r.pendingPayout > 0);
    if (payoutStatus === "Paid")    result = result.filter((r) => r.pendingPayout === 0 && r.totalPayout > 0);

    res.status(200).json({
      associates: result,
      summary: {
        // Total Commission — sum of associateEarningAmount for Completed work,
        // identical to the Admin Dashboard's "Total Income" statistic.
        totalCommission,
        totalIncome:   result.reduce((s, r) => s + r.totalIncome, 0),
        totalPayout:   result.reduce((s, r) => s + r.totalPayout, 0),
        pendingPayout: result.reduce((s, r) => s + r.pendingPayout, 0),
      },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN — Income for one associate, grouped by client
// ─────────────────────────────────────────────────────────────────────────────
export const listIncomeByClient = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    const { associateId } = req.params;
    if (!mongoose.isValidObjectId(associateId)) return next(errorHandler(400, "Invalid associate ID"));

    await syncPayouts(associateId);

    const { search, payoutStatus } = req.query;
    const aOid = toOid(associateId);

    const invoiceMatch = { associate: aOid };
    if (search) invoiceMatch.customerName = { $regex: search, $options: "i" };

    const [clientGroups, payouts, associate, commissionByClient] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "Verified" } },
        { $lookup: { from: "invoices", localField: "invoice", foreignField: "_id", as: "inv" } },
        { $unwind: "$inv" },
        { $match: { "inv.associate": aOid, ...(search ? { "inv.customerName": { $regex: search, $options: "i" } } : {}) } },
        {
          $group: {
            _id:         "$inv.customerName",
            clientEmail: { $first: "$inv.customerEmail" },
            clientPhone: { $first: "$inv.customerPhone" },
            totalIncome: { $sum: "$amount" },
            invoiceIds:  { $addToSet: "$inv._id" },
          },
        },
        { $sort: { totalIncome: -1 } },
      ]),
      Payout.find({ associate: aOid }).lean(),
      User.findById(associateId).select("name email mobileNumber").lean(),
      // Total Commission per client — sourced from completed WorkSubmissions,
      // same as the dashboard/associate-summary figure, independent of
      // invoice/payment status.
      getCommissionByClient(aOid),
    ]);

    const payoutByClient = new Map();
    for (const p of payouts) {
      const key = p.clientName;
      if (!payoutByClient.has(key)) payoutByClient.set(key, { totalPayout: 0, pendingPayout: 0 });
      const e = payoutByClient.get(key);
      if (p.status === "Paid") e.totalPayout += p.payoutAmount;
      else e.pendingPayout += p.payoutAmount;
    }

    // Merge clients that have verified payments with clients that have
    // completed work but no verified payment yet, so commission earned from
    // completed work is never hidden just because an invoice hasn't been
    // paid/verified yet.
    const clientMap = new Map();
    for (const c of clientGroups) {
      clientMap.set(c._id, {
        clientName:  c._id,
        clientEmail: c.clientEmail,
        clientPhone: c.clientPhone,
        totalIncome: c.totalIncome,
        invoiceIds:  c.invoiceIds,
      });
    }
    for (const name of commissionByClient.keys()) {
      if (!name) continue;
      if (!clientMap.has(name)) {
        clientMap.set(name, { clientName: name, clientEmail: null, clientPhone: null, totalIncome: 0, invoiceIds: [] });
      }
      if (search && !name.toLowerCase().includes(search.trim().toLowerCase())) {
        clientMap.delete(name);
      }
    }

    let result = Array.from(clientMap.values()).map((c) => {
      const po             = payoutByClient.get(c.clientName) || { totalPayout: 0 };
      const totalCommission = commissionByClient.get(c.clientName) || 0;
      const totalPayout      = po.totalPayout || 0;
      return {
        clientName:    c.clientName,
        clientEmail:   c.clientEmail,
        clientPhone:   c.clientPhone,
        totalIncome:   c.totalIncome,
        totalCommission,
        totalPayout,
        // Withdrawal Amount = commission earned so far minus what's already
        // been paid out — never derived from Payout status flags alone,
        // since a payout record may not exist yet for freshly completed work.
        pendingPayout: Math.max(totalCommission - totalPayout, 0),
        invoiceIds:    c.invoiceIds,
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);

    if (payoutStatus === "Pending") result = result.filter((r) => r.pendingPayout > 0);
    if (payoutStatus === "Paid")    result = result.filter((r) => r.pendingPayout === 0 && r.totalPayout > 0);

    res.status(200).json({ clients: result, associate });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN / ASSOCIATE — Work income rows for one associate + client
// ─────────────────────────────────────────────────────────────────────────────
export const listIncomeByWork = async (req, res, next) => {
  try {
    const { associateId } = req.params;
    const { clientName, payoutStatus } = req.query;

    // Associates can only access their own
    if (req.user.role !== "admin" && req.user.id !== associateId) {
      return next(errorHandler(403, "Access denied"));
    }
    if (!mongoose.isValidObjectId(associateId)) return next(errorHandler(400, "Invalid associate ID"));

    // Ensure Payout records exist (and are self-healed) before reading them.
    await syncPayouts(associateId);

    const invoiceFilter = { associate: toOid(associateId) };
    if (clientName) invoiceFilter.customerName = { $regex: `^${decodeURIComponent(clientName)}$`, $options: "i" };

    const invoices = await Invoice.find(invoiceFilter).lean();
    const invoiceIds = invoices.map((i) => i._id);

    const [payments, payouts, works] = await Promise.all([
      Payment.find({ invoice: { $in: invoiceIds }, status: "Verified" }).lean(),
      Payout.find({ invoice: { $in: invoiceIds } }).lean(),
      WorkSubmission.find({ invoiceId: { $in: invoiceIds } })
        .populate("service", "name").lean(),
    ]);

    const pmMap = new Map();
    for (const p of payments) {
      const key = String(p.invoice);
      if (!pmMap.has(key)) pmMap.set(key, { total: 0, date: null, p });
      const e = pmMap.get(key);
      e.total += p.amount;
      if (!e.date || new Date(p.paymentDate) > new Date(e.date)) e.date = p.paymentDate;
    }
    const poMap  = new Map(payouts.map((p) => [String(p.invoice), p]));
    const wkMap  = new Map(works.map((w) => [String(w.invoiceId), w]));

    let rows = invoices.map((inv) => {
      const pm  = pmMap.get(String(inv._id))  || { total: 0, date: null };
      const po  = poMap.get(String(inv._id));
      const wrk = wkMap.get(String(inv._id));
      return {
        invoiceId:     inv._id,
        invoiceNumber: inv.invoiceNumber,
        workId:        wrk?.workId || null,
        workMongoId:   wrk?._id   || null,
        serviceName:   wrk?.service?.name || inv.services?.[0]?.name || "—",
        clientName:    inv.customerName,
        amountReceived:pm.total,
        paymentDate:   pm.date,
        paymentStatus: inv.invoiceStatus,
        payoutId:      po?._id            || null,
        // associateEarningAmount lives on WorkSubmission, not Invoice — this
        // is the actual Total Commission / Withdrawal Amount for this work.
        payoutAmount:  po?.payoutAmount   ?? wrk?.associateEarningAmount ?? 0,
        payoutStatus:  po?.status         || "Pending",
        payoutDate:    po?.paidAt         || null,
        transactionRef:po?.transactionRef || null,
      };
    });

    if (payoutStatus) rows = rows.filter((r) => r.payoutStatus === payoutStatus);

    res.status(200).json({ works: rows });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN — Full Manage Payout page data
// ─────────────────────────────────────────────────────────────────────────────
export const getPayoutDetail = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    const { invoiceId } = req.params;
    if (!mongoose.isValidObjectId(invoiceId)) return next(errorHandler(400, "Invalid invoice ID"));

    const invoice = await Invoice.findById(invoiceId)
      .populate("associate", "name email mobileNumber bankDetails")
      .lean();
    if (!invoice) return next(errorHandler(404, "Invoice not found"));

    const aOid = invoice.associate._id;

    const [payments, work] = await Promise.all([
      Payment.find({ invoice: invoiceId, status: "Verified" }).sort({ paymentDate: 1 }).lean(),
      WorkSubmission.findOne({ invoiceId }).populate("service", "name").lean(),
    ]);

    // Ensure payout record exists — payoutAmount must come from the
    // WorkSubmission (associateEarningAmount lives there, not on Invoice).
    // Self-heal any older record that was stored with a stale/zero amount.
    const correctAmount = work?.associateEarningAmount || 0;
    let payout = await Payout.findOne({ invoice: toOid(invoiceId) });
    if (!payout) {
      const latestPayment = [...payments].sort((a, b) => new Date(b.verifiedAt) - new Date(a.verifiedAt))[0];
      payout = await Payout.create({
        associate:    aOid,
        work:         work?._id,
        invoice:      toOid(invoiceId),
        payment:      latestPayment?._id,
        clientName:   invoice.customerName,
        payoutAmount: correctAmount,
        status:       "Pending",
      });
    } else if (payout.status !== "Paid" && payout.payoutAmount !== correctAmount) {
      payout.payoutAmount = correctAmount;
      if (!payout.work && work?._id) payout.work = work._id;
      await payout.save();
    }
    payout = payout.toObject();

    // Total Commission for this associate — same source as the dashboard and
    // Income pages, independent of invoice/payment status.
    const [summaryAgg, totalIncomeAgg, totalCommission] = await Promise.all([
      Payout.aggregate([
        { $match: { associate: aOid, status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$payoutAmount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "Verified" } },
        { $lookup: { from: "invoices", localField: "invoice", foreignField: "_id", as: "inv" } },
        { $unwind: "$inv" },
        { $match: { "inv.associate": aOid } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      getTotalCommission(aOid),
    ]);

    const totalPayoutPaid = summaryAgg[0]?.total || 0;
    // Remaining Balance = Total Commission earned so far minus what's already
    // been paid out — never derived from Payout "Pending" amounts alone,
    // since a record may not exist yet for freshly completed work.
    const remainingBalance = Math.max(totalCommission - totalPayoutPaid, 0);

    const amountReceived = payments.reduce((s, p) => s + p.amount, 0);
    const lastPayment    = payments[payments.length - 1];

    res.status(200).json({
      associate: invoice.associate,
      invoice: {
        _id:           invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customerName:  invoice.customerName,
        totalAmount:   invoice.totalAmount,
        amountReceived,
        paymentDate:   lastPayment?.paymentDate || null,
        invoiceStatus: invoice.invoiceStatus,
      },
      work: {
        workId:      work?.workId    || null,
        serviceName: work?.service?.name || invoice.services?.[0]?.name || "—",
      },
      payout: {
        _id:           payout._id,
        payoutAmount:  payout.payoutAmount,
        status:        payout.status,
        paidAt:        payout.paidAt   || null,
        transactionRef:payout.transactionRef || null,
        remarks:       payout.remarks  || null,
      },
      payments,
      summary: {
        totalIncome:      totalIncomeAgg[0]?.total || 0,
        totalCommission,
        totalPayoutPaid,
        currentPayoutDue: payout.status !== "Paid" ? payout.payoutAmount : 0,
        remainingBalance,
      },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN — Mark payout as paid
// ─────────────────────────────────────────────────────────────────────────────
export const markPayoutPaid = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return next(errorHandler(403, "Access denied"));
    const { payoutId } = req.params;
    if (!mongoose.isValidObjectId(payoutId)) return next(errorHandler(400, "Invalid payout ID"));

    const payout = await Payout.findById(payoutId);
    if (!payout) return next(errorHandler(404, "Payout record not found"));
    if (payout.status === "Paid") return next(errorHandler(400, "Payout is already marked as paid"));

    const { transactionRef, remarks, paidAt } = req.body;
    if (!transactionRef?.trim()) return next(errorHandler(400, "Transaction reference number is required"));

    payout.status         = "Paid";
    payout.transactionRef = transactionRef.trim();
    payout.remarks        = remarks?.trim() || undefined;
    payout.paidAt         = paidAt ? new Date(paidAt) : new Date();
    payout.createdBy      = req.user.id;
    await payout.save();

    res.status(200).json({ message: "Payout marked as paid", payout });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. ASSOCIATE — Own income: clients + overall summary
// ─────────────────────────────────────────────────────────────────────────────
export const associateIncomeSummary = async (req, res, next) => {
  try {
    const aOid = toOid(req.user.id);
    await syncPayouts(req.user.id);

    const [clientRows, payouts, totalCommission, commissionByClient] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "Verified" } },
        { $lookup: { from: "invoices", localField: "invoice", foreignField: "_id", as: "inv" } },
        { $unwind: "$inv" },
        { $match: { "inv.associate": aOid } },
        {
          $group: {
            _id:         "$inv.customerName",
            clientEmail: { $first: "$inv.customerEmail" },
            totalIncome: { $sum: "$amount" },
          },
        },
        { $sort: { totalIncome: -1 } },
      ]),
      Payout.find({ associate: aOid }).lean(),
      // Total Commission earned from completed work — same source as the
      // Associate Dashboard's "My Income" statistic, scoped to this associate.
      getTotalCommission(aOid),
      // Per-client breakdown of that same commission, so each row in the
      // table can show its own Total Commission (not just the grand total).
      getCommissionByClient(aOid),
    ]);

    const payoutByClient = new Map();
    for (const p of payouts) {
      if (!payoutByClient.has(p.clientName)) payoutByClient.set(p.clientName, { paid: 0, pending: 0 });
      const e = payoutByClient.get(p.clientName);
      if (p.status === "Paid") e.paid += p.payoutAmount;
      else e.pending += p.payoutAmount;
    }

    // Merge clients with verified payments and clients with completed work
    // but no verified payment yet, so commission is never hidden.
    const clientMap = new Map();
    for (const r of clientRows) {
      clientMap.set(r._id, { clientName: r._id, clientEmail: r.clientEmail, totalIncome: r.totalIncome });
    }
    for (const name of commissionByClient.keys()) {
      if (!name) continue;
      if (!clientMap.has(name)) {
        clientMap.set(name, { clientName: name, clientEmail: null, totalIncome: 0 });
      }
    }

    const clients = Array.from(clientMap.values()).map((r) => {
      const po              = payoutByClient.get(r.clientName) || { paid: 0 };
      const totalCommissionForClient = commissionByClient.get(r.clientName) || 0;
      const totalPayout     = po.paid || 0;
      return {
        clientName:      r.clientName,
        clientEmail:     r.clientEmail,
        totalIncome:     r.totalIncome,
        totalCommission: totalCommissionForClient,
        totalPayout,
        // Withdrawal Amount = commission earned so far minus what's already
        // been paid out, mirroring the same rule used on the admin side.
        pendingPayout: Math.max(totalCommissionForClient - totalPayout, 0),
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);

    const summary = {
      // Total Commission — sum of associateEarningAmount for this associate's
      // Completed work, identical to the Associate Dashboard's "My Income" statistic.
      totalCommission,
      totalIncome:   clients.reduce((s, c) => s + c.totalIncome, 0),
      totalPayout:   clients.reduce((s, c) => s + c.totalPayout, 0),
      pendingPayout: clients.reduce((s, c) => s + c.pendingPayout, 0),
    };

    res.status(200).json({ clients, summary });
  } catch (error) { next(error); }
};