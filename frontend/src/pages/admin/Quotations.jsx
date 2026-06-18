import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminQuotations = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: params.get("status") || "", from: "", to: "" });
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

  const sendQuotation = async (id) => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const downloadPdf = (id) => window.open(`${axiosInstance.defaults.baseURL}/quotations/${id}/pdf`, "_blank");

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500">Manage and send quotations to associates.</p>
          </div>
          <Link to="/admin/quotations/create" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            + New Quotation
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-5">
          <input className="border rounded-lg p-2 col-span-2" placeholder="Search…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" className="border rounded-lg p-2" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{q.customerName}</p>
                      <p className="text-xs text-gray-500">{q.customerEmail}</p>
                    </td>
                    <td className="p-3">{q.associate?.name}</td>
                    <td className="p-3 font-medium">{formatMoney(q.totalAmount)}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                      {q.status === "Draft" && (
                        <button onClick={() => sendQuotation(q._id)} className="text-green-700 text-xs font-medium hover:underline">Send</button>
                      )}
                      <button onClick={() => downloadPdf(q._id)} className="text-gray-600 text-xs font-medium hover:underline">PDF</button>
                    </td>
                  </tr>
                ))}
                {!loading && !quotations.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={7}>No quotations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminQuotations;
