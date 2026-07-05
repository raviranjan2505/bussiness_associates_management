import React, { useEffect, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const ManagePayments = () => {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { invoiceStatus: "Waiting For Payment" };
      if (search) params.search = search;
      const res = await axiosInstance.get("/invoices", { params });
      setInvoices(res.data.invoices || []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-sm text-gray-500">Track and verify all client payments.</p>
        </div>
        <div className="flex gap-3">
          <input className="border rounded-lg p-2 text-sm flex-1" placeholder="Search invoice / customer" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Search</button>
        </div>
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Balance</th><th className="p-3">Commission</th><th className="p-3">Status</th><th className="p-3">Due</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="p-4 text-center text-gray-500">Loading...</td></tr>
                  : invoices.map((inv) => (
                    <tr key={inv._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.customerName}</td>
                      <td className="p-3">{fmt(inv.totalAmount)}</td>
                      <td className="p-3 text-green-700">{fmt(inv.amountPaid)}</td>
                      <td className="p-3 text-red-600 font-medium">{fmt(inv.balanceDue)}</td>
                      <td className="p-3 text-emerald-700 font-medium">
                        {fmt((inv.services || []).reduce((s, sv) => s + Number(sv.associateEarningAmount || 0), 0))}
                      </td>
                      <td className="p-3"><StatusBadge status={inv.invoiceStatus} /></td>
                      <td className="p-3 text-gray-500">{inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "-"}</td>
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

export default ManagePayments;