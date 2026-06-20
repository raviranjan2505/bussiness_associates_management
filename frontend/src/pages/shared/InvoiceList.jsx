import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const STATUSES = ["Generated", "Waiting For Payment", "Partially Paid", "Paid", "Overdue", "Cancelled"];

const InvoiceList = () => {
  const { currentUser } = useSelector((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", invoiceStatus: searchParams.get("invoiceStatus") || "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices", { params });
      setInvoices(res.data.invoices || []);
    } catch { toast.error("Failed to load invoices"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openPdf = (id) => window.open(`http://localhost:3000/api/invoices/${id}/pdf`, "_blank");

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Track and manage all invoices and payment status.</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-3">
          <input className="border rounded-lg p-2 text-sm" placeholder="Search by number or customer" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2 text-sm" value={filters.invoiceStatus} onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
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
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  {isAdmin && <th className="p-3">Associate</th>}
                  <th className="p-3">Total</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={isAdmin ? 9 : 8} className="p-4 text-center text-gray-400">Loading...</td></tr>}
                {!loading && invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-blue-700">{inv.invoiceNumber}</td>
                    <td className="p-3">
                      <div className="font-medium">{inv.customerName}</div>
                      <div className="text-xs text-gray-500">{inv.customerEmail}</div>
                    </td>
                    {isAdmin && <td className="p-3">{inv.associate?.name}</td>}
                    <td className="p-3 font-medium">₹{Number(inv.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-amber-700 font-medium">₹{Number(inv.balanceDue || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3 text-gray-500">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link to={isAdmin ? `/admin/invoices/${inv._id}` : `/associate/invoices/${inv._id}`} className="text-blue-700 font-medium text-xs">View</Link>
                        <button onClick={() => openPdf(inv._id)} className="text-gray-600 text-xs hover:text-gray-900">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !invoices.length && (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="p-4 text-gray-500">No invoices found.</td></tr>
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
