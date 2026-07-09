import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { TrendingUp, Receipt, CheckCircle2, Wallet } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { StatCard } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const AssociateIncome = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ clients: [], summary: {} });
  const [search, setSearch] = useState("");
  const [payoutFilter, setPayoutFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/payouts/associate/summary");
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load income");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Keep Total Commission fresh: re-fetch when the tab regains focus and on
    // a light interval, so a work item marked Completed elsewhere shows up
    // here without requiring a manual refresh.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(load, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = data.clients || [];
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.clientName.toLowerCase().includes(q));
    }
    if (payoutFilter === "Pending") list = list.filter((c) => c.pendingPayout > 0);
    if (payoutFilter === "Paid")    list = list.filter((c) => c.pendingPayout === 0 && c.totalPayout > 0);
    return list;
  }, [data.clients, search, payoutFilter]);

  const { summary } = data;
  const { page, totalPages, paged: pagedClients, resetPage, onPrev, onNext } = usePagination(filtered, 10);
  useEffect(() => { resetPage(); }, [search, payoutFilter]);

  return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Income</h1>
            <p className="text-sm text-gray-500">Income and payout summary for your clients.</p>
          </div>
          <button onClick={load} disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Total Commission — headline card, sourced from completed work only,
            identical to the "My Income" figure shown on the Associate Dashboard. */}
        <StatCard
          icon={TrendingUp}
          title="Total Commission"
          value={fmt(summary.totalCommission)}
          color="emerald"
          subtitle="Sum of commission earned from all completed work."
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={Receipt}      title="Total Service Charge" value={fmt(summary.totalIncome)}   color="blue" />
          <StatCard icon={CheckCircle2} title="Total Payout Paid"    value={fmt(summary.totalPayout)}   color="green" />
          <StatCard icon={Wallet}       title="Withdrawal Amount"    value={fmt(summary.pendingPayout)} color="orange" />
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2.5 text-sm" placeholder="Search client name…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="border rounded-lg p-2.5 text-sm" value={payoutFilter}
            onChange={(e) => setPayoutFilter(e.target.value)}>
            <option value="">All Payout Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <button onClick={load} className="rounded-lg bg-gray-900 text-white text-sm px-4">Search</button>
        </div>

        {/* Client table */}
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
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">No income records found.</td></tr>
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
                        onClick={() => navigate(`/associate/income/${encodeURIComponent(c.clientName)}/works`)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        View Works
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filtered.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateIncome;