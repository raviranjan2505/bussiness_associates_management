import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";
import { PAYMENT_METHODS } from "../../utils/data";

const AdminPayments = () => {
  const [urlParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoiceId: urlParams.get("invoiceId") || "",
    amount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    paymentMethod: "Bank Transfer",
    transactionId: "",
    remarks: "",
  });
  const [filter, setFilter] = useState({ invoiceId: urlParams.get("invoiceId") || "" });

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
    const res = await axiosInstance.get("/payments", { params: p });
    setPayments(res.data.payments || []);
  };

  useEffect(() => {
    load();
    axiosInstance.get("/invoices", { params: { invoiceStatus: "Waiting For Payment" } })
      .then((r) => setInvoices(r.data.invoices || [])).catch(console.error);
  }, []);

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/payments", form);
      toast.success("Payment recorded");
      setShowForm(false);
      setForm({ ...form, amount: "", transactionId: "", remarks: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const verify = async (id) => {
    try {
      await axiosInstance.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const fail = async (id) => {
    if (!window.confirm("Mark this payment as failed?")) return;
    try {
      await axiosInstance.patch(`/payments/${id}/fail`);
      toast.success("Marked as failed");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Record and verify payments against invoices.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            + Record Payment
          </button>
        </div>

        {/* Add Payment Form */}
        {showForm && (
          <form onSubmit={addPayment} className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <h2 className="col-span-3 font-semibold text-gray-900">Record New Payment</h2>
            <div className="col-span-3 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice *</label>
              <select className="w-full border rounded-lg p-2" value={form.invoiceId} required
                onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
                <option value="">Select invoice</option>
                {invoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>{inv.invoiceNumber} – {inv.customerName} ({formatMoney(inv.balanceDue)} due)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" min="1" className="w-full border rounded-lg p-2" required
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input type="date" className="w-full border rounded-lg p-2"
                value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select className="w-full border rounded-lg p-2" value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
              <input className="w-full border rounded-lg p-2" value={form.transactionId}
                onChange={(e) => setForm({ ...form, transactionId: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input className="w-full border rounded-lg p-2" value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div className="col-span-3 flex gap-3">
              <button type="submit" className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm">Save Payment</button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 rounded-lg px-5 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {/* Filter */}
        <div className="flex gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <select className="border rounded-lg p-2 flex-1 max-w-xs" value={filter.invoiceId}
            onChange={(e) => setFilter({ ...filter, invoiceId: e.target.value })}>
            <option value="">All Invoices</option>
            {invoices.map((inv) => <option key={inv._id} value={inv._id}>{inv.invoiceNumber} – {inv.customerName}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.invoice?.invoiceNumber}</td>
                    <td className="p-3">{p.invoice?.customerName}</td>
                    <td className="p-3">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3 text-xs text-gray-500">{p.transactionId || "—"}</td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      {p.status === "Pending" && (
                        <>
                          <button onClick={() => verify(p._id)} className="text-green-700 text-xs font-medium hover:underline">Verify</button>
                          <button onClick={() => fail(p._id)} className="text-red-600 text-xs font-medium hover:underline">Fail</button>
                        </>
                      )}
                      {p.status === "Verified" && (
                        <a href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`} target="_blank" rel="noreferrer"
                          className="text-blue-700 text-xs font-medium hover:underline">Receipt</a>
                      )}
                    </td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={8}>No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
