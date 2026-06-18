import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { PROJECT_STATUSES } from "../../utils/data";

const ManageProjects = () => {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ projectStatus: "", search: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices", { params });
      setInvoices(res.data.invoices || []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Projects">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-sm text-gray-500">Track all active projects and update their workflow status.</p>
        </div>

        <div className="flex gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 text-sm flex-1" placeholder="Search invoice / customer" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2 text-sm" value={filters.projectStatus} onChange={(e) => setFilters({ ...filters, projectStatus: e.target.value })}>
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Associate</th><th className="p-3">Project Status</th><th className="p-3">Expected</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td></tr>
                  : invoices.map((inv) => (
                    <tr key={inv._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.customerName}</td>
                      <td className="p-3">{inv.associate?.name}</td>
                      <td className="p-3"><StatusBadge status={inv.projectStatus} /></td>
                      <td className="p-3 text-gray-500">{inv.expectedCompletionDate ? moment(inv.expectedCompletionDate).format("DD MMM YYYY") : "-"}</td>
                      <td className="p-3">
                        <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 text-xs font-medium hover:underline">Manage</Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageProjects;
