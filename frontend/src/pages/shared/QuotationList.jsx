import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"];

const QuotationList = () => {
  const { currentUser } = useSelector((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const [searchParams] = useSearchParams();

  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: searchParams.get("status") || "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/quotations", { params });
      setQuotations(res.data.quotations || []);
    } catch { toast.error("Failed to load quotations"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (id) => {
    if (!window.confirm("Send this quotation to the associate?")) return;
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft quotation?")) return;
    try {
      await axiosInstance.delete(`/quotations/${id}`);
      toast.success("Quotation deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const openPdf = (id) => window.open(`http://localhost:3000/api/quotations/${id}/pdf`, "_blank");

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500">Manage service quotations and client approvals.</p>
          </div>
          {!isAdmin && (
            <Link to="/associate/quotations/new" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">+ Create Quotation</Link>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-3">
          <input
            className="border rounded-lg p-2 text-sm"
            placeholder="Search by number or customer"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select className="border rounded-lg p-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Apply</button>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Customer</th>
                  {isAdmin && <th className="p-3">Associate</th>}
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="p-4 text-center text-gray-400">Loading...</td></tr>
                )}
                {!loading && quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-blue-700">{q.quotationNumber}</td>
                    <td className="p-3">
                      <div className="font-medium">{q.customerName}</div>
                      <div className="text-xs text-gray-500">{q.customerEmail}</div>
                    </td>
                    {isAdmin && <td className="p-3">{q.associate?.name}</td>}
                    <td className="p-3 font-medium">₹{Number(q.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3 text-gray-500">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={isAdmin ? `/admin/quotations/${q._id}` : `/associate/quotations/${q._id}`} className="text-blue-700 font-medium text-xs">View</Link>
                        <button onClick={() => openPdf(q._id)} className="text-gray-600 text-xs hover:text-gray-900">PDF</button>
                        {isAdmin && q.status === "Draft" && (
                          <button onClick={() => handleSend(q._id)} className="text-indigo-700 text-xs font-medium">Send</button>
                        )}
                        {q.status === "Draft" && (
                          <button onClick={() => handleDelete(q._id)} className="text-red-600 text-xs">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !quotations.length && (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="p-4 text-gray-500">No quotations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default QuotationList;
