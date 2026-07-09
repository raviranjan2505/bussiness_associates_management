import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { Wallet, AlertCircle, CalendarCheck, CalendarClock } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import { StatCard } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { PAYMENT_METHODS } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const EMPTY_SUMMARY = { totalPaid: 0, totalDue: 0, todayPaid: 0, todayDue: 0 };

const AdminPayments = () => {
  const [params] = useSearchParams();

  // ── State ─────────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const { page, totalPages, paged: pagedPayments, resetPage, onPrev, onNext } = usePagination(payments, 10);

  // Filters
  const [invoiceId, setInvoiceId] = useState(params.get("invoiceId") || "");
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");

  // Add Payment form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    invoiceId:     params.get("invoiceId") || "",
    amount:        "",
    paymentDate:   "",
    paymentMethod: "Bank Transfer",
    transactionId: "",
    remarks:       "",
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async (filters = {}) => {
    setLoading(true);
    resetPage();
    try {
      const p = {};
      if (filters.invoiceId ?? invoiceId) p.invoiceId = filters.invoiceId ?? invoiceId;
      if (filters.from ?? from)           p.from      = filters.from ?? from;
      if (filters.to   ?? to)             p.to        = filters.to   ?? to;

      const res = await axiosInstance.get("/payments", { params: p });
      setPayments(res.data.payments || []);
      setSummary(res.data.summary   || EMPTY_SUMMARY);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Reset all filters ─────────────────────────────────────────────────────
  const handleReset = () => {
    setInvoiceId("");
    setFrom("");
    setTo("");
    load({ invoiceId: "", from: "", to: "" });
  };

  // ── Existing actions (unchanged) ──────────────────────────────────────────
  const verify = async (id) => {
    try {
      await axiosInstance.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const fail = async (id) => {
    try {
      await axiosInstance.patch(`/payments/${id}/fail`);
      toast.success("Payment marked as failed");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const markPaid = async (invId) => {
    try {
      await axiosInstance.patch(`/payments/invoice/${invId}/mark-paid`);
      toast.success("Invoice marked as paid");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    if (!addForm.invoiceId) return toast.error("Invoice ID is required");
    try {
      await axiosInstance.post("/payments", addForm);
      toast.success("Payment recorded");
      setShowAdd(false);
      setAddForm({ invoiceId: "", amount: "", paymentDate: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "" });
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Record, verify and track all payments.</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            + Add Payment
          </button>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Wallet}         title="Total Paid Amount" value={formatMoney(summary.totalPaid)} color="green" />
          <StatCard icon={AlertCircle}    title="Total Due Amount" value={formatMoney(summary.totalDue)} color="red" />
          <StatCard icon={CalendarCheck}  title="Today's Paid Amount" value={formatMoney(summary.todayPaid)} color="blue" />
          <StatCard icon={CalendarClock}  title="Today's Due Amount" value={formatMoney(summary.todayDue)} color="orange" />
        </div>

        {/* ── Add Payment Form (unchanged) ──────────────────────────────── */}
        {showAdd && (
          <form
            onSubmit={addPayment}
            className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice ID *</label>
              <input className="w-full border rounded-lg p-2" placeholder="Paste invoice id…"
                value={addForm.invoiceId}
                onChange={(e) => setAddForm({ ...addForm, invoiceId: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.) *</label>
              <input type="number" min="1" className="w-full border rounded-lg p-2"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
              <input type="date" className="w-full border rounded-lg p-2"
                value={addForm.paymentDate}
                onChange={(e) => setAddForm({ ...addForm, paymentDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select className="w-full border rounded-lg p-2"
                value={addForm.paymentMethod}
                onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID</label>
              <input className="w-full border rounded-lg p-2"
                value={addForm.transactionId}
                onChange={(e) => setAddForm({ ...addForm, transactionId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input className="w-full border rounded-lg p-2"
                value={addForm.remarks}
                onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm">Save Payment</button>
              <button type="button" onClick={() => setShowAdd(false)} className="border rounded-lg px-5 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px_auto_auto]">
            {/* Invoice filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Invoice</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-400"
                placeholder="Invoice ID or number…"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            {/* From date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-400"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            {/* To date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-400"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            {/* Filter button */}
            <div className="flex items-end">
              <button
                onClick={() => load()}
                disabled={loading}
                className="w-full rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Filter"}
              </button>
            </div>
            {/* Reset button */}
            <div className="flex items-end">
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {(invoiceId || from || to) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {invoiceId && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  Invoice: {invoiceId}
                  <button onClick={() => { setInvoiceId(""); load({ invoiceId: "" }); }} className="text-gray-400 hover:text-gray-700">×</button>
                </span>
              )}
              {from && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  From: {moment(from).format("DD MMM YYYY")}
                  <button onClick={() => { setFrom(""); load({ from: "" }); }} className="text-gray-400 hover:text-gray-700">×</button>
                </span>
              )}
              {to && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  To: {moment(to).format("DD MMM YYYY")}
                  <button onClick={() => { setTo(""); load({ to: "" }); }} className="text-gray-400 hover:text-gray-700">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Payments Table (unchanged columns & actions) ──────────────── */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-400">Loading…</td></tr>
                ) : pagedPayments.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.invoice?.invoiceNumber}</td>
                    <td className="p-3 text-gray-700">{p.invoice?.customerName || "—"}</td>
                    <td className="p-3">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className={`p-3 text-right font-medium ${p.invoice?.balanceDue > 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatMoney(p.invoice?.balanceDue || 0)}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{p.transactionId || "—"}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        {p.status === "Pending" && (
                          <>
                            <button onClick={() => verify(p._id)} className="text-green-700 text-xs font-medium hover:underline">Verify</button>
                            <button onClick={() => fail(p._id)} className="text-red-600 text-xs font-medium hover:underline">Fail</button>
                            <button onClick={() => markPaid(p.invoice?._id)} className="text-blue-700 text-xs font-medium hover:underline">Mark Invoice Paid</button>
                          </>
                        )}
                        {p.status === "Verified" && (
                          <a
                            href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`}
                            target="_blank" rel="noreferrer"
                            className="text-gray-600 text-xs font-medium hover:underline"
                          >
                            Receipt
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !payments.length && (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={payments.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;