import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUS_DATA } from "../../utils/data";
import toast from "react-hot-toast";

const QuotationList = () => {
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const preset = searchParams.get("status");
    if (preset) setFilters((f) => ({ ...f, status: preset }));
  }, []);

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/quotations", { params });
    setQuotations(res.data.quotations || []);
  };

  useEffect(() => { load().catch(console.error); }, [filters.status]);

  const handleSend = async (id) => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500">Manage all customer quotations.</p>
          </div>
          <Link to="/admin/quotations/create"
            className="bg-gray-900 text-white rounded-lg px-4 py-2 text-center text-sm">
            + New Quotation
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap gap-3">
          <input className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Search by customer, number..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {QUOTATION_STATUS_DATA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Apply</button>
        </div>

        {/* Status quick-filters */}
        <div className="flex flex-wrap gap-2">
          {["", "Draft", "Sent", "Accepted", "Rejected"].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                filters.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Number</th><th className="p-3">Customer</th>
                  <th className="p-3">Associate</th><th className="p-3">Total</th>
                  <th className="p-3">Status</th><th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{q.quotationNumber}</td>
                    <td className="p-3">
                      <p>{q.customerName}</p>
                      <p className="text-xs text-gray-400">{q.customerEmail}</p>
                    </td>
                    <td className="p-3">{q.associate?.name || "—"}</td>
                    <td className="p-3 font-medium">Rs. {(q.totalAmount || 0).toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 font-medium text-xs">View</Link>
                      {q.status === "Draft" && (
                        <button onClick={() => handleSend(q._id)} className="text-green-700 font-medium text-xs">
                          Send
                        </button>
                      )}
                      <a href={`http://localhost:3000/api/quotations/${q._id}/pdf`} target="_blank" rel="noreferrer"
                        className="text-gray-600 font-medium text-xs">PDF</a>
                    </td>
                  </tr>
                ))}
                {!quotations.length && (
                  <tr><td colSpan={7} className="p-4 text-gray-400 text-center">No quotations found.</td></tr>
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
