import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import toast from "react-hot-toast";

const PaymentList = () => {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });

  const load = async () => {
    // Load invoices with payment information
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/invoices", { params });
    setInvoices(res.data.invoices || []);
  };

  useEffect(() => { load().catch(console.error); }, []);

  const handleMarkPaid = async (invoiceId) => {
    try {
      const bal = invoices.find(inv => inv._id === invoiceId)?.balanceDue;
      await axiosInstance.post(`/payments/invoice/${invoiceId}/mark-paid`, { amount: bal });
      toast.success("Invoice marked as paid");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="text-sm text-gray-500">Monitor payment status across all invoices.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap gap-3">
          <input className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Search by customer, invoice..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="Waiting For Payment">Waiting For Payment</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
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
                  <th className="p-3">Paid</th><th className="p-3">Balance</th>
                  <th className="p-3">Commission</th>
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
                    <td className={`p-3 font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-gray-600"}`}>
                      Rs. {(inv.balanceDue || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-emerald-700 font-medium">
                      Rs. {(inv.services || []).reduce((sum, s) => sum + Number(s.associateEarningAmount || 0), 0).toFixed(2)}
                    </td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}</td>
                    <td className="p-3 flex gap-2">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 text-xs font-medium">View</Link>
                      {["Waiting For Payment", "Partially Paid", "Overdue"].includes(inv.invoiceStatus) && (
                        <button onClick={() => handleMarkPaid(inv._id)} className="text-emerald-700 text-xs font-medium">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan={10} className="p-4 text-gray-400 text-center">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default PaymentList;