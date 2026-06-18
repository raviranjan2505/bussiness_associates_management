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
  const [filters, setFilters] = useState({
    search: "",
    projectStatus: params.get("projectStatus") || "",
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices", { params: p });
      setInvoices(res.data.invoices || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Projects">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Monitor and update project workflow statuses.</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 flex-1 min-w-[200px]" placeholder="Search by customer…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.projectStatus}
            onChange={(e) => setFilters({ ...filters, projectStatus: e.target.value })}>
            <option value="">All Statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((inv) => (
            <div key={inv._id} className="bg-white border border-gray-100 rounded-lg p-4 space-y-3 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{inv.customerName}</p>
                  <p className="text-xs text-gray-400">{inv.associate?.name}</p>
                </div>
                <StatusBadge status={inv.projectStatus} />
              </div>

              <div className="text-xs space-y-1 text-gray-600">
                {inv.startDate && (
                  <div className="flex justify-between">
                    <span>Started</span>
                    <span>{moment(inv.startDate).format("DD MMM YYYY")}</span>
                  </div>
                )}
                {inv.expectedCompletionDate && (
                  <div className="flex justify-between">
                    <span>Expected</span>
                    <span className={moment(inv.expectedCompletionDate).isBefore(moment()) && inv.projectStatus !== "Completed" ? "text-red-600 font-medium" : ""}>
                      {moment(inv.expectedCompletionDate).format("DD MMM YYYY")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-medium">{formatMoney(inv.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Due</span>
                  <span className={`font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatMoney(inv.balanceDue)}
                  </span>
                </div>
              </div>

              <Link to={`/admin/invoices/${inv._id}`}
                className="block text-center border border-gray-300 text-gray-700 rounded-lg py-2 text-xs hover:bg-gray-50">
                View & Update Status →
              </Link>
            </div>
          ))}
          {!loading && !invoices.length && (
            <p className="col-span-3 py-12 text-center text-gray-500">No projects found.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProjects;
