import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { PROJECT_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminProjects = () => {
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", projectStatus: params.get("projectStatus") || "" });

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/invoices", { params: p });
    setInvoices(res.data.invoices || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Projects">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Tracker</h1>
          <p className="text-sm text-gray-500">Monitor workflow status of all active projects.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_220px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search customer / invoice #…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.projectStatus}
            onChange={(e) => setFilters({ ...filters, projectStatus: e.target.value })}>
            <option value="">All Project Statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Filter</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((inv) => (
            <Link key={inv._id} to={`/admin/invoices/${inv._id}`}
              className="bg-white border border-gray-100 rounded-lg p-5 hover:shadow-sm hover:border-gray-300 transition-all space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{inv.customerName}</p>
                </div>
                <StatusBadge status={inv.projectStatus} />
              </div>
              <div className="text-sm text-gray-600">Associate: <span className="font-medium text-gray-900">{inv.associate?.name}</span></div>
              <div className="text-sm text-gray-600">Total: <span className="font-medium">{formatMoney(inv.totalAmount)}</span></div>
              {inv.deadline && (
                <div className="text-xs text-red-600 font-medium">
                  Deadline: {moment(inv.deadline).format("DD MMM YYYY")}
                </div>
              )}
              {inv.expectedCompletionDate && (
                <div className="text-xs text-gray-500">
                  Expected: {moment(inv.expectedCompletionDate).format("DD MMM YYYY")}
                </div>
              )}
            </Link>
          ))}
          {!invoices.length && (
            <div className="col-span-3 text-center py-12 text-gray-500">No projects found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default AdminProjects;
