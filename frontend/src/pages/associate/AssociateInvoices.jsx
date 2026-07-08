import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import { StatCard } from "../../components/StatCard";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const emptySummary = { totalInvoices: 0, paidInvoices: 0, partiallyPaidInvoices: 0, pendingInvoices: 0 };

const AssociateInvoices = () => {
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", invoiceStatus: params.get("invoiceStatus") || "" });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(emptySummary);

  const load = async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices", { params: p });
      setInvoices(res.data.invoices || []);
    } catch (e) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  // Summary cards reflect the associate's own invoices only — the backend
  // scopes /invoices/summary the same way it scopes the list itself.
  const loadSummary = async () => {
    try {
      const res = await axiosInstance.get("/invoices/summary");
      setSummary(res.data.summary || emptySummary);
    } catch (e) {
      // supplementary — don't block the page if this fails
    }
  };

  useEffect(() => { load(); loadSummary(); }, []);

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-sm text-gray-500">Track your invoices, payments and project progress.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText}     title="Total Invoices" value={summary.totalInvoices} color="blue" />
          <StatCard icon={CheckCircle2} title="Paid Invoices" value={summary.paidInvoices} color="emerald" />
          <StatCard icon={Clock}        title="Partial Paid Invoices" value={summary.partiallyPaidInvoices} color="amber" />
          <StatCard icon={AlertCircle}  title="Pending Invoices" value={summary.pendingInvoices} color="red" />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_220px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search by customer or invoice number…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.invoiceStatus}
            onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
            <option value="">All Statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-4 text-center text-gray-400">Loading…</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/associate/invoices/${inv._id}`} className="text-blue-700 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{inv.customerName}</p>
                      <p className="text-xs text-gray-500">{inv.customerEmail}</p>
                    </td>
                    <td className="p-3 text-right font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className="p-3 text-right text-green-700">{formatMoney(inv.amountPaid)}</td>
                    <td className="p-3 text-right text-red-600">{formatMoney(inv.balanceDue)}</td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/associate/invoices/${inv._id}`}
                          className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                        <a href={`${axiosInstance.defaults.baseURL}/invoices/${inv._id}/pdf`}
                          target="_blank" rel="noreferrer"
                          className="text-gray-600 text-xs font-medium hover:underline">PDF</a>
                        <a href={`${axiosInstance.defaults.baseURL}/invoices/${inv._id}/pdf/client`}
                          target="_blank" rel="noreferrer"
                          className="text-gray-600 text-xs font-medium hover:underline">Client PDF</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !invoices.length && (
                  <tr><td colSpan={8} className="p-4 text-center text-gray-500">No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateInvoices;