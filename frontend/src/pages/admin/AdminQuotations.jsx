import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";

const AdminQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/quotations", { params });
      setQuotations(res.data.quotations || []);
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, []);

  const handleSend = async (id) => {
    if (!window.confirm("Send this quotation to the associate for review?")) return;
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft quotation?")) return;
    try {
      await axiosInstance.delete(`/quotations/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500">Manage all associate quotations</p>
          </div>
          <Link
            to="/admin/quotations/new"
            className="bg-gray-900 text-white rounded-lg px-4 py-2 text-center text-sm"
          >
            + New Quotation
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-4">
          <input
            className="border rounded-lg p-2 text-sm"
            placeholder="Search by number or customer"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="border rounded-lg p-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {QUOTATION_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            className="border rounded-lg p-2 text-sm"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <input
            type="date"
            className="border rounded-lg p-2 text-sm"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
        <button
          onClick={load}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm"
        >
          Apply Filters
        </button>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{q.quotationNumber}</td>
                    <td className="p-3">
                      <p className="font-medium">{q.customerName}</p>
                      <p className="text-xs text-gray-500">{q.customerEmail}</p>
                    </td>
                    <td className="p-3">{q.associate?.name}</td>
                    <td className="p-3 font-medium">₹{(q.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link className="text-blue-700 font-medium text-xs" to={`/admin/quotations/${q._id}`}>
                          View
                        </Link>
                        {q.status === "Draft" && (
                          <>
                            <Link className="text-indigo-700 font-medium text-xs" to={`/admin/quotations/${q._id}/edit`}>
                              Edit
                            </Link>
                            <button
                              onClick={() => handleSend(q._id)}
                              className="text-emerald-700 font-medium text-xs"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => handleDelete(q._id)}
                              className="text-red-600 font-medium text-xs"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <a
                          href={`${axiosInstance.defaults.baseURL}/quotations/${q._id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-600 font-medium text-xs"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !quotations.length && (
                  <tr>
                    <td colSpan={7} className="p-5 text-center text-gray-500">
                      No quotations found.
                    </td>
                  </tr>
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
