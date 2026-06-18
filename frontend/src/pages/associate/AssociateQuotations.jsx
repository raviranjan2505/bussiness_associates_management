import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AssociateQuotations = () => {
  const [params] = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: params.get("status") || "" });

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/quotations", { params: p });
    setQuotations(res.data.quotations || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quotations</h1>
          <p className="text-sm text-gray-500">View, accept or reject quotations sent by admin.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search by customer…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotations.map((q) => (
            <Link key={q._id} to={`/associate/quotations/${q._id}`}
              className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{q.quotationNumber}</p>
                  <p className="text-sm text-gray-500">{q.customerName}</p>
                </div>
                <StatusBadge status={q.status} />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">{formatMoney(q.totalAmount)}</p>
              <p className="mt-1 text-xs text-gray-500">{q.services?.length || 0} service(s) · {moment(q.createdAt).format("DD MMM YYYY")}</p>
              {q.status === "Sent" && (
                <div className="mt-3 text-xs text-blue-600 font-medium">⚡ Action required — review this quotation</div>
              )}
            </Link>
          ))}
          {!quotations.length && (
            <div className="col-span-3 text-center py-12 text-gray-500">No quotations found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssociateQuotations;
