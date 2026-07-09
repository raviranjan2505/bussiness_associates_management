import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { FileText, PenLine, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import { StatCardLink } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AssociateQuotations = () => {
  const [params] = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: params.get("status") || "" });
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [summary, setSummary] = useState({ total: 0, draft: 0, accepted: 0, rejected: 0 });
  const { page, totalPages, paged: pagedQuotations, resetPage, onPrev, onNext } = usePagination(quotations, 10);

  const load = async () => {
    setLoading(true);
    resetPage();
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/quotations", { params: p });
      setQuotations(res.data.quotations || []);
    } catch (e) {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await axiosInstance.get("/quotations/summary");
      setSummary(res.data.summary || { total: 0, draft: 0, accepted: 0, rejected: 0 });
    } catch (e) {
      // summary cards are supplementary — a failure here shouldn't block the page
    }
  };

  useEffect(() => { load(); loadSummary(); }, []);

  const downloadPdf = (id) =>
    window.open(`${axiosInstance.defaults.baseURL}/quotations/${id}/pdf`, "_blank");

  // ── Accept a quotation directly from the list ──────────────────────────
  const acceptQuotation = async (id) => {
    setActingId(id);
    try {
      const res = await axiosInstance.post(`/quotations/${id}/accept`);
      toast.success("Quotation accepted — invoice generated");
      const updated = res.data.quotation;
      setQuotations((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status: updated?.status || "Accepted" } : q))
      );
      loadSummary();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to accept quotation");
    } finally {
      setActingId(null);
    }
  };

  // ── Reject a quotation directly from the list ──────────────────────────
  const rejectQuotation = async (id) => {
    const rejectionReason = window.prompt("Please provide a reason for rejecting this quotation:");
    if (rejectionReason === null) return; // cancelled
    if (!rejectionReason.trim()) return toast.error("Rejection reason is required");
    setActingId(id);
    try {
      const res = await axiosInstance.post(`/quotations/${id}/reject`, { rejectionReason });
      toast.success("Quotation rejected");
      const updated = res.data.quotation;
      setQuotations((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status: updated?.status || "Rejected" } : q))
      );
      loadSummary();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reject quotation");
    } finally {
      setActingId(null);
    }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quotations</h1>
          <p className="text-sm text-gray-500">View, accept or reject quotations sent by admin.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCardLink icon={FileText}     title="Total Quotations" value={summary.total}    to="/associate/quotations"            color="purple" />
          <StatCardLink icon={PenLine}      title="Draft"            value={summary.draft}    to="/associate/quotations?status=Draft"    color="gray" />
          <StatCardLink icon={CheckCircle2} title="Accepted"         value={summary.accepted} to="/associate/quotations?status=Accepted" color="green" />
          <StatCardLink icon={XCircle}      title="Rejected"         value={summary.rejected} to="/associate/quotations?status=Rejected" color="red" />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search by customer or quotation number…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-400">Loading…</td></tr>
                ) : pagedQuotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/associate/quotations/${q._id}`} className="text-blue-700 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{q.customerName}</p>
                      <p className="text-xs text-gray-500">{q.customerEmail}</p>
                    </td>
                    <td className="p-3 text-right font-medium">{formatMoney(q.totalAmount)}</td>
                    <td className="p-3 text-green-700 font-medium">
                      {q.associateEarningAmount > 0 ? formatMoney(q.associateEarningAmount) : "—"}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={q.status} />
                      {q.status === "Sent" && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">⚡ Action required</p>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {moment(q.createdAt).format("DD MMM YYYY")}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/associate/quotations/${q._id}`}
                          className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                        <button onClick={() => downloadPdf(q._id)}
                          className="text-gray-600 text-xs font-medium hover:underline">PDF</button>
                        <a href={`${axiosInstance.defaults.baseURL}/quotations/${q._id}/pdf/client`}
                          target="_blank" rel="noreferrer"
                          className="text-gray-600 text-xs font-medium hover:underline">Client PDF</a>
                        {q.status === "Sent" && (
                          <>
                            <button
                              onClick={() => acceptQuotation(q._id)}
                              disabled={actingId === q._id}
                              className="text-green-700 text-xs font-semibold hover:underline disabled:opacity-50"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => rejectQuotation(q._id)}
                              disabled={actingId === q._id}
                              className="text-red-600 text-xs font-semibold hover:underline disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !quotations.length && (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">No quotations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={quotations.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateQuotations;