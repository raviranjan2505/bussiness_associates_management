import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { INVOICE_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminInvoices = () => {
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({ search: "", invoiceStatus: params.get("invoiceStatus") || "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/invoices", { params: p });
      setInvoices(res.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">All invoices auto-generated from accepted quotations.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_200px_100px]">
          <input className="border rounded-lg p-2" placeholder="Search customer / invoice #…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.invoiceStatus}
            onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}>
            <option value="">All Statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{inv.customerName}</p>
                      <p className="text-xs text-gray-500">{inv.customerEmail}</p>
                    </td>
                    <td className="p-3">{inv.associate?.name}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className={`p-3 text-right font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatMoney(inv.balanceDue)}
                    </td>
                    <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                    <td className="p-3">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "—"}</td>
                    <td className="p-3 flex gap-2">
                      <Link to={`/admin/invoices/${inv._id}`} className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                      <Link to={`/admin/payments?invoiceId=${inv._id}`} className="text-green-700 text-xs font-medium hover:underline">Payments</Link>
                    </td>
                  </tr>
                ))}
                {!loading && !invoices.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={8}>No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};
export default AdminInvoices;
