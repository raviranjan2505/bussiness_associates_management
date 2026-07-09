import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { TrendingUp, Receipt, CheckCircle2, Wallet } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { StatCard } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const AdminIncome = () => {
  const navigate = useNavigate();
  const [associates, setAssociates] = useState([]);
  const [summary, setSummary] = useState({ totalCommission: 0, totalIncome: 0, totalPayout: 0, pendingPayout: 0 });
  const [search, setSearch] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const { page, totalPages, paged: pagedAssociates, resetPage, onPrev, onNext } = usePagination(associates, 10);

  const load = async () => {
    setLoading(true);
    resetPage();
    try {
      const res = await axiosInstance.get("/payouts/admin/associates", {
        params: { search, payoutStatus },
      });
      setAssociates(res.data.associates || []);
      // Total Commission comes from the same source as the Admin Dashboard
      // (completed-work earnings), so it stays in sync automatically whenever
      // a work item is marked Completed.
      setSummary(res.data.summary || { totalCommission: 0, totalIncome: 0, totalPayout: 0, pendingPayout: 0 });
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load income data");
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

  const totals = useMemo(() => ({
    income:  associates.reduce((s, a) => s + a.totalIncome, 0),
    paid:    associates.reduce((s, a) => s + a.totalPayout, 0),
    pending: associates.reduce((s, a) => s + a.pendingPayout, 0),
  }), [associates]);

  return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Income</h1>
            <p className="text-sm text-gray-500">Income and payout summary grouped by associate.</p>
          </div>
          <button onClick={load} disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Total Commission — headline card, sourced from completed work only,
            identical to the figure shown on the Admin Dashboard. */}
        <StatCard
          icon={TrendingUp}
          title="Total Commission"
          value={fmt(summary.totalCommission)}
          color="emerald"
          subtitle="Sum of commission earned from all completed work."
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={Receipt}      title="Total Service Charge" value={fmt(totals.income)}  color="blue" />
          <StatCard icon={CheckCircle2} title="Total Payout Paid"    value={fmt(totals.paid)}    color="green" />
          <StatCard icon={Wallet}       title="Withdrawal Amount"    value={fmt(totals.pending)} color="orange" />
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2.5 text-sm" placeholder="Search associate name or email…"
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
                  <th className="px-4 py-3">Associate</th>
                  <th className="px-4 py-3 text-center">Clients</th>
                  <th className="px-4 py-3 text-right">Total Service Charge</th>
                  <th className="px-4 py-3 text-right">Total Commission</th>
                  <th className="px-4 py-3 text-right">Total Payout Paid</th>
                  <th className="px-4 py-3 text-right">Withdrawal Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading…</td></tr>
                ) : associates.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">No income records found.</td></tr>
                ) : pagedAssociates.map((a) => (
                  <tr key={String(a.associateId)} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{a.associateName}</p>
                      <p className="text-xs text-gray-400">{a.associateEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{a.totalClients}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(a.totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(a.totalCommission)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(a.totalPayout)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${a.pendingPayout > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {fmt(a.pendingPayout)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/income/${a.associateId}/clients`)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        View Clients
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={associates.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminIncome;