import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AssociateQuotations = () => {
  const [params] = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: params.get("status") || "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
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

  useEffect(() => { load(); }, []);

  const downloadPdf = (id) =>
    window.open(`${axiosInstance.defaults.baseURL}/quotations/${id}/pdf`, "_blank");

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quotations</h1>
          <p className="text-sm text-gray-500">View, accept or reject quotations sent by admin.</p>
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
                ) : quotations.map((q) => (
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
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateQuotations;