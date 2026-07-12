import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const PayoutBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
    status === "Paid" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
  }`}>{status || "Pending"}</span>
);

const AssociateIncomeWorks = () => {
  const { clientName } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((s) => s.user);
  const decoded = decodeURIComponent(clientName || "");

  const [works, setWorks] = useState([]);
  const [payoutStatus, setPayoutStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/payouts/associate/associates/${currentUser._id}/works`,
        { params: { clientName: decoded, payoutStatus } }
      );
      setWorks(res.data.works || []);
      resetPage();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load work income");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientName]);

  const { page, totalPages, paged: pagedWorks, resetPage, onPrev, onNext } = usePagination(works, 10);

  const totals = {
    income:  works.reduce((s, w) => s + w.amountReceived, 0),
    payout:  works.reduce((s, w) => s + (w.payoutStatus === "Paid" ? w.payoutAmount : 0), 0),
    pending: works.reduce((s, w) => s + (w.payoutStatus !== "Paid" ? w.payoutAmount : 0), 0),
  };

  return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <button onClick={() => navigate("/associate/income")}
              className="text-sm text-blue-700 hover:underline font-medium">
              ← Back to Clients
            </button>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{decoded} — Work Income</h1>
            <p className="text-sm text-gray-500">View-only. Payouts are managed by admin.</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="border rounded-lg p-2.5 text-sm"
              value={payoutStatus}
              onChange={(e) => setPayoutStatus(e.target.value)}>
              <option value="">All Payout Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
            <button onClick={load} disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Total Service Charge",   value: totals.income,  color: "text-blue-700",   bg: "bg-blue-50" },
            { label: "Total Payout Paid",    value: totals.payout,  color: "text-green-700",  bg: "bg-green-50" },
            { label: "Withdrawal Amount", value: totals.pending, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border border-gray-100 p-5 shadow-sm ${c.bg}`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.color}`}>{fmt(c.value)}</p>
            </div>
          ))}
        </div>

        {/* Table — view only, no Manage Payout button */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Work ID</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3 text-right">Amount Received</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3 text-right">Payout Amount</th>
                  <th className="px-4 py-3">Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading…</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No work income records found.</td></tr>
                ) : pagedWorks.map((w) => (
                  <tr key={String(w.invoiceId)} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{w.workId || "—"}</td>
                    <td className="px-4 py-3 text-gray-800">{w.serviceName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{w.invoiceNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {w.paymentDate ? moment(w.paymentDate).format("DD MMM YYYY") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(w.amountReceived)}</td>
                    <td className="px-4 py-3"><StatusBadge status={w.paymentStatus} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(w.payoutAmount)}</td>
                    <td className="px-4 py-3"><PayoutBadge status={w.payoutStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={works.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateIncomeWorks;