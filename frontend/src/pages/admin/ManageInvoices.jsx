import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUSES } from "../../utils/data";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const ManageInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ invoiceStatus: "", search: "" });
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

  const handleMarkPaid = async (id) => {
    if (!window.confirm("Mark this invoice as fully paid?")) return;
    try {
      await axiosInstance.patch(`/payments/invoice/${id}/mark-paid`);
      toast.success("Invoice marked as paid");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-sm text-gray-500">Track all invoices, payments and project billing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 text-sm" placeholder="Search invoice / customer" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2 text-sm" value={filters.invoiceStatus} onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice No.</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">No invoices found.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3">{inv.associate?.name}</td>
                    <td className="p-3 font-semibold">{fmt(inv.totalAmount)}</td>
                    <td className="p-3 text-green-700">{fmt(inv.amountPaid)}</td>
                    <td className="p-3 text-red-600">{fmt(inv.balanceDue)}</td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3 text-gray-500">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "-"}</td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                        {inv.invoiceStatus !== "Paid" && <button onClick={() => handleMarkPaid(inv._id)} className="text-green-700 text-xs font-medium hover:underline">Mark Paid</button>}
                        <a href={`http://localhost:3000/api/invoices/${inv._id}/pdf`} target="_blank" rel="noreferrer" className="text-purple-700 text-xs font-medium hover:underline">PDF</a>
                      </div>
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

export default ManageInvoices;
