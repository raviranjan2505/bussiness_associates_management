import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUS_DATA } from "../../utils/data";

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const preset = searchParams.get("status");
    if (preset) setFilters((f) => ({ ...f, status: preset }));
  }, []);

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/invoices", { params });
    setInvoices(res.data.invoices || []);
  };

  useEffect(() => { load().catch(console.error); }, [filters.status]);

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">All auto-generated invoices from accepted quotations.</p>
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          {["", "Waiting For Payment", "Partially Paid", "Paid", "Overdue"].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                filters.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap gap-3">
          <input className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Search..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {INVOICE_STATUS_DATA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Apply</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice #</th><th className="p-3">Customer</th>
                  <th className="p-3">Associate</th><th className="p-3">Total</th>
                  <th className="p-3">Paid</th><th className="p-3">Due</th>
                  <th className="p-3">Status</th><th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3">{inv.associate?.name}</td>
                    <td className="p-3">Rs. {(inv.totalAmount || 0).toFixed(2)}</td>
                    <td className="p-3 text-emerald-700">Rs. {(inv.amountPaid || 0).toFixed(2)}</td>
                    <td className={`p-3 font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-gray-900"}`}>
                      Rs. {(inv.balanceDue || 0).toFixed(2)}
                    </td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3">
                      {inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}
                    </td>
                    <td className="p-3 flex gap-2">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 font-medium text-xs">View</Link>
                      <a href={`http://localhost:3000/api/invoices/${inv._id}/pdf`} target="_blank" rel="noreferrer"
                        className="text-gray-600 font-medium text-xs">PDF</a>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan={9} className="p-4 text-gray-400 text-center">No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceList;
