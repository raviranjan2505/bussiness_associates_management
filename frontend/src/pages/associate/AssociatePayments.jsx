import React, { useEffect, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import { Wallet, AlertCircle, CalendarCheck, CalendarClock } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import { StatCard } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

const EMPTY_SUMMARY = { totalPaid: 0, totalDue: 0, todayPaid: 0, todayDue: 0 };

const AssociatePayments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/payments");
      setPayments(res.data.payments || []);
      // /payments already scopes this summary to the logged-in associate's
      // own invoices, same as it does for the payments list itself.
      setSummary(res.data.summary || EMPTY_SUMMARY);
    } catch (e) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = payments.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${p.invoice?.invoiceNumber} ${p.invoice?.customerName} ${p.transactionId} ${p.paymentMethod}`
      .toLowerCase().includes(q);
  });

  const { page, totalPages, paged: pagedPayments, resetPage, onPrev, onNext } = usePagination(filtered, 10);
  useEffect(() => { resetPage(); }, [search]);

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-sm text-gray-500">View payment history and download receipts.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Wallet}        title="Total Paid Amount" value={formatMoney(summary.totalPaid)} color="green" />
          <StatCard icon={AlertCircle}   title="Total Due Amount" value={formatMoney(summary.totalDue)} color="red" />
          <StatCard icon={CalendarCheck} title="Today's Paid Amount" value={formatMoney(summary.todayPaid)} color="blue" />
          <StatCard icon={CalendarClock} title="Today's Due Amount" value={formatMoney(summary.todayDue)} color="orange" />
        </div>

        {/* Filter */}
        <div className="flex gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 flex-1" placeholder="Search by invoice, customer or transaction ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Refresh</button>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Commission</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-400">Loading…</td></tr>
                ) : pagedPayments.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      {p.invoice?._id ? (
                        <a href={`/associate/invoices/${p.invoice._id}`}
                          className="text-blue-700 hover:underline">
                          {p.invoice.invoiceNumber}
                        </a>
                      ) : (
                        <span className="text-gray-600">{p.invoice?.invoiceNumber || "—"}</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{p.invoice?.customerName || "—"}</td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {p.paymentDate ? (
                        <>
                          <div>{moment(p.paymentDate).format("DD MMM YYYY")}</div>
                          <div className="text-xs text-gray-400">{moment(p.paymentDate).format("hh:mm A")}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-gray-600">{p.paymentMethod}</td>
                    <td className="p-3 text-right font-medium text-gray-900">{formatMoney(p.amount)}</td>
                    <td className="p-3 text-right font-medium text-emerald-700">
                      {formatMoney((p.invoice?.services || []).reduce((s, sv) => s + Number(sv.associateEarningAmount || 0), 0))}
                    </td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3 text-xs text-gray-500">{p.transactionId || "—"}</td>
                    <td className="p-3">
                      {p.status === "Verified" ? (
                        <a href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`}
                          target="_blank" rel="noreferrer"
                          className="text-blue-700 text-xs font-medium hover:underline">
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">
                    {search ? "No payments match your search." : "No payment records found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filtered.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociatePayments;