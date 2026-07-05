import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const emptySummary = { totalInvoices: 0, paidInvoices: 0, partiallyPaidInvoices: 0, pendingInvoices: 0 };

const SummaryCard = ({ label, value, accent }) => (
  <div className="bg-white border border-gray-100 rounded-lg p-4">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${accent || "text-gray-900"}`}>{value}</p>
  </div>
);

const AdminInvoices = () => {
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", invoiceStatus: params.get("invoiceStatus") || "" });
  // Date range is kept separate from the existing search/status filters —
  // it only gets applied when "Filter" is clicked, and "Reset" only clears this.
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(false);

  const load = async (activeDateRange = dateRange) => {
    setLoading(true);
    try {
      const p = Object.fromEntries(
        Object.entries({ ...filters, ...activeDateRange }).filter(([, v]) => v)
      );
      const res = await axiosInstance.get("/invoices", { params: p });
      setInvoices(res.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Summary cards are driven only by the selected date range on the backend
  // (existing Invoice collection — no new data/collections), per requirement.
  const loadSummary = async (activeDateRange = dateRange) => {
    try {
      const p = Object.fromEntries(Object.entries(activeDateRange).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices/summary", { params: p });
      setSummary(res.data.summary || emptySummary);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); loadSummary(); }, []);

  const applyDateFilter = () => {
    load(dateRange);
    loadSummary(dateRange);
  };

  const resetDateFilter = () => {
    const cleared = { from: "", to: "" };
    setDateRange(cleared);
    load(cleared);
    loadSummary(cleared);
  };

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">All invoices auto-generated from accepted quotations.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total Invoices" value={summary.totalInvoices} />
          <SummaryCard label="Paid Invoices" value={summary.paidInvoices} accent="text-emerald-600" />
          <SummaryCard label="Partial Paid Invoices" value={summary.partiallyPaidInvoices} accent="text-amber-600" />
          <SummaryCard label="Pending Invoices" value={summary.pendingInvoices} accent="text-red-600" />
        </div>

        {/* Date range filter (new) */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_100px_100px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
          <button
            onClick={applyDateFilter}
            className="self-end bg-gray-900 text-white rounded-lg px-4 py-2 h-[42px]"
          >
            Filter
          </button>
          <button
            onClick={resetDateFilter}
            className="self-end border border-gray-300 text-gray-700 rounded-lg px-4 py-2 h-[42px] hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        {/* Existing search / status filter — unchanged */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search customer / invoice #…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.invoiceStatus}
            onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
            <option value="">All Statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => load()} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{inv.customerName}</p>
                      <p className="text-xs text-gray-500">{inv.customerEmail}</p>
                    </td>
                    <td className="p-3">{inv.associate?.name}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className={`p-3 text-right font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatMoney(inv.balanceDue)}
                    </td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}</td>
                    <td className="p-3 flex gap-2">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                      <Link to={`/admin/payments?invoiceId=${inv._id}`} className="text-green-700 text-xs font-medium hover:underline">Payments</Link>
                    </td>
                  </tr>
                ))}
                {!loading && !invoices.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={8}>No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};
export default AdminInvoices;