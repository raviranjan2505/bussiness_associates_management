import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { PROJECT_STATUS_DATA } from "../../utils/data";

const ProjectList = () => {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", projectStatus: "" });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/invoices", { params });
    setInvoices(res.data.invoices || []);
  };

  useEffect(() => { load().catch(console.error); }, [filters.projectStatus]);

  return (
    <DashboardLayout activeMenu="Projects">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-sm text-gray-500">Track workflow status of all active projects.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["", "Work Assigned", "In Progress", "Review Pending", "Completed", "On Hold"].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, projectStatus: s })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                filters.projectStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap gap-3">
          <input className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Search..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2" value={filters.projectStatus}
            onChange={(e) => setFilters({ ...filters, projectStatus: e.target.value })}>
            <option value="">All Project Statuses</option>
            {PROJECT_STATUS_DATA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Apply</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice #</th><th className="p-3">Customer</th>
                  <th className="p-3">Associate</th><th className="p-3">Invoice Status</th>
                  <th className="p-3">Project Status</th><th className="p-3">Expected</th>
                  <th className="p-3">Deadline</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3">{inv.associate?.name}</td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3"><StatusBadge status={inv.projectStatus} /></td>
                    <td className="p-3">
                      {inv.expectedCompletionDate ? moment(inv.expectedCompletionDate).format("DD MMM YYYY") : "—"}
                    </td>
                    <td className="p-3">
                      {inv.deadline ? (
                        <span className={moment(inv.deadline).isBefore() ? "text-red-600 font-medium" : ""}>
                          {moment(inv.deadline).format("DD MMM YYYY")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 font-medium text-xs">Manage</Link>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan={8} className="p-4 text-gray-400 text-center">No projects found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ProjectList;
