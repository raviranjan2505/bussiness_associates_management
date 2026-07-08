import React, { useEffect, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

const EMPTY_SUMMARY = { totalPaid: 0, totalDue: 0, todayPaid: 0, todayDue: 0 };

const SummaryCard = ({ label, value, color, bg, border }) => (
  <div className={`rounded-xl border p-5 shadow-sm ${bg} ${border}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${color}`}>{formatMoney(value)}</p>
  </div>
);

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

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-sm text-gray-500">View payment history and download receipts.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Total Paid Amount" value={summary.totalPaid} color="text-green-700" bg="bg-green-50" border="border-green-100" />
          <SummaryCard label="Total Due Amount" value={summary.totalDue} color="text-red-600" bg="bg-red-50" border="border-red-100" />
          <SummaryCard label="Today's Paid Amount" value={summary.todayPaid} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" />
          <SummaryCard label="Today's Due Amount" value={summary.todayDue} color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
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
              <thead className="bg-gray-50 text-left text-gray-500">
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
                ) : filtered.map((p) => (
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
                      {moment(p.paymentDate).format("DD MMM YYYY")}
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
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociatePayments;