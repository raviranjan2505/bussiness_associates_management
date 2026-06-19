import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { PAYMENT_METHODS } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminPayments = () => {
  const [params] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [invoiceId, setInvoiceId] = useState(params.get("invoiceId") || "");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ invoiceId: params.get("invoiceId") || "", amount: "", paymentDate: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "" });

  const load = async () => {
    const p = invoiceId ? { invoiceId } : {};
    const res = await axiosInstance.get("/payments", { params: p });
    setPayments(res.data.payments || []);
  };

  useEffect(() => { load(); }, []);

  const verify = async (id) => {
    try {
      await axiosInstance.patch(`/payments/${id}/verify`);
      toast.success("Payment verified");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const fail = async (id) => {
    try {
      await axiosInstance.patch(`/payments/${id}/fail`);
      toast.success("Payment marked as failed");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const markPaid = async (invId) => {
    try {
      await axiosInstance.patch(`/payments/invoice/${invId}/mark-paid`);
      toast.success("Invoice marked as paid");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    if (!addForm.invoiceId) return toast.error("Invoice ID is required");
    try {
      await axiosInstance.post("/payments", addForm);
      toast.success("Payment recorded");
      setShowAdd(false);
      setAddForm({ invoiceId: "", amount: "", paymentDate: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "" });
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Error"); }
  };

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Record, verify and track all payments.</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            + Add Payment
          </button>
        </div>

        {/* Add payment form */}
        {showAdd && (
          <form onSubmit={addPayment} className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice ID *</label>
              <input className="w-full border rounded-lg p-2" placeholder="Paste invoice id…" value={addForm.invoiceId}
                onChange={(e) => setAddForm({ ...addForm, invoiceId: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.) *</label>
              <input type="number" min="1" className="w-full border rounded-lg p-2" value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
              <input type="date" className="w-full border rounded-lg p-2" value={addForm.paymentDate}
                onChange={(e) => setAddForm({ ...addForm, paymentDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select className="w-full border rounded-lg p-2" value={addForm.paymentMethod}
                onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID</label>
              <input className="w-full border rounded-lg p-2" value={addForm.transactionId}
                onChange={(e) => setAddForm({ ...addForm, transactionId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input className="w-full border rounded-lg p-2" value={addForm.remarks}
                onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm">Save Payment</button>
              <button type="button" onClick={() => setShowAdd(false)} className="border rounded-lg px-5 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {/* Filter bar */}
        <div className="flex gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 flex-1" placeholder="Filter by invoice ID…" value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Filter</button>
          {invoiceId && <button onClick={() => { setInvoiceId(""); load(); }} className="border rounded-lg px-4 py-2 text-sm">Clear</button>}
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.invoice?.invoiceNumber}</td>
                    <td className="p-3">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="p-3 text-xs text-gray-500">{p.transactionId || "—"}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      {p.status === "Pending" && (
                        <>
                          <button onClick={() => verify(p._id)} className="text-green-700 text-xs font-medium hover:underline">Verify</button>
                          <button onClick={() => fail(p._id)} className="text-red-600 text-xs font-medium hover:underline">Fail</button>
                          <button onClick={() => markPaid(p.invoice?._id)} className="text-blue-700 text-xs font-medium hover:underline">Mark Invoice Paid</button>
                        </>
                      )}
                      {p.status === "Verified" && (
                        <a href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`} target="_blank" rel="noreferrer"
                          className="text-gray-600 text-xs font-medium hover:underline">Receipt</a>
                      )}
                    </td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={7}>No payments found.</td></tr>
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
