import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const AdminIncomeClients = () => {
  const { associateId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ clients: [], associate: null });
  const [search, setSearch] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/payouts/admin/associates/${associateId}/clients`, {
        params: { search, payoutStatus },
      });
      setData(res.data);
      resetPage();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load client income");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [associateId]);

  const clients = data.clients || [];
  const associate = data.associate;
  const { page, totalPages, paged: pagedClients, resetPage, onPrev, onNext } = usePagination(clients, 10);

  const totals = {
    income:     clients.reduce((s, c) => s + c.totalIncome, 0),
    commission: clients.reduce((s, c) => s + (c.totalCommission || 0), 0),
    paid:       clients.reduce((s, c) => s + c.totalPayout, 0),
    pending:    clients.reduce((s, c) => s + c.pendingPayout, 0),
  };

  return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <button onClick={() => navigate("/admin/income")} className="text-sm text-blue-700 hover:underline font-medium">
              ← Back to Associates
            </button>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {associate?.name ? `${associate.name} — Clients` : "Client Income"}
            </h1>
            <p className="text-sm text-gray-500">{associate?.email}</p>
          </div>
          <button onClick={load} disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Total Commission — headline card, sourced from completed work only. */}
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Commission</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{fmt(totals.commission)}</p>
          <p className="mt-1 text-xs text-gray-400">Sum of commission earned from this associate's completed work.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Total Service Charge",      value: totals.income,  color: "text-blue-700",   bg: "bg-blue-50" },
            { label: "Total Payout Paid", value: totals.paid,    color: "text-green-700",  bg: "bg-green-50" },
            { label: "Withdrawal Amount",    value: totals.pending, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border border-gray-100 p-5 shadow-sm ${c.bg}`}>
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold ${c.color}`}>{fmt(c.value)}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2.5 text-sm" placeholder="Search client name…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2.5 text-sm" value={payoutStatus}
            onChange={(e) => setPayoutStatus(e.target.value)}>
            <option value="">All Payout Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <button onClick={load} className="rounded-lg bg-gray-900 text-white text-sm px-4">Search</button>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3 text-right">Total Service Charge</th>
                  <th className="px-4 py-3 text-right">Total Commission</th>
                  <th className="px-4 py-3 text-right">Total Payout Paid</th>
                  <th className="px-4 py-3 text-right">Withdrawal Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading…</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">No clients found.</td></tr>
                ) : pagedClients.map((c) => (
                  <tr key={c.clientName} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.clientName}</p>
                      {c.clientEmail && <p className="text-xs text-gray-400">{c.clientEmail}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(c.totalCommission)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(c.totalPayout)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${c.pendingPayout > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {fmt(c.pendingPayout)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/income/${associateId}/clients/${encodeURIComponent(c.clientName)}/works`)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        View Works
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={clients.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminIncomeClients;