import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AssociateInvoices = () => {
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ invoiceStatus: params.get("invoiceStatus") || "", search: "" });

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/invoices", { params: p });
    setInvoices(res.data.invoices || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-sm text-gray-500">Track your invoices, payments and project progress.</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 flex-1 min-w-[200px]" placeholder="Search by customer…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.invoiceStatus}
            onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
            <option value="">All Statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((inv) => (
            <Link key={inv._id} to={`/associate/invoices/${inv._id}`}
              className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{inv.customerName}</p>
                </div>
                <StatusBadge status={inv.invoiceStatus} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-gray-900">{formatMoney(inv.totalAmount)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-green-600">Paid</p>
                  <p className="font-bold text-green-700">{formatMoney(inv.amountPaid)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-red-500">Due</p>
                  <p className="font-bold text-red-700">{formatMoney(inv.balanceDue)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">Due: {inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}</p>
            </Link>
          ))}
          {!invoices.length && (
            <div className="col-span-3 text-center py-12 text-gray-500">No invoices found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssociateInvoices;
