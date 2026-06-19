import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { WORK_STATUSES, PAYMENT_METHODS } from "../../utils/data";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const InvoiceDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentDate: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "" });
  const [projectForm, setProjectForm] = useState({ projectStatus: "", remark: "", expectedCompletionDate: "" });

  const load = async () => {
    try {
      const res = await axiosInstance.get(`/invoices/${id}`);
      setData(res.data);
      setProjectForm((p) => ({ ...p, projectStatus: res.data.invoice?.projectStatus || "" }));
    } catch { toast.error("Failed to load invoice"); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/payments", { invoiceId: id, ...paymentForm });
      toast.success("Payment recorded");
      setPaymentForm({ amount: "", paymentDate: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "" });
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const handleVerifyPayment = async (payId, status) => {
    try {
      await axiosInstance.patch(`/payments/${payId}/verify`, { status });
      toast.success(`Payment ${status}`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const handleProjectStatus = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/invoices/${id}/project-status`, projectForm);
      toast.success("Work status updated");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  if (!data) return <DashboardLayout activeMenu="Invoices"><div className="p-6">Loading...</div></DashboardLayout>;

  const { invoice, payments = [], timeline = [] } = data;

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/admin/invoices" className="text-sm text-blue-700">← Back to Invoices</Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500">{invoice.customerName} • {invoice.associate?.name}</p>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={invoice.invoiceStatus} />
            <StatusBadge status={invoice.projectStatus} />
            <a href={`http://localhost:3000/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer" className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">PDF</a>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Services</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2 text-left">Service</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody>{invoice.services?.map((s, i) => <tr key={i} className="border-t"><td className="p-2">{s.name}</td><td className="p-2 text-right">{fmt(s.price)}</td><td className="p-2 text-right">{s.quantity}</td><td className="p-2 text-right font-medium">{fmt(s.amount)}</td></tr>)}</tbody>
              </table>
              <div className="mt-4 flex justify-end space-y-1 text-sm">
                <div className="w-56 space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
                  {invoice.discount?.amount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{fmt(invoice.discount.amount)}</span></div>}
                  {invoice.tax?.amount > 0 && <div className="flex justify-between"><span>Tax ({invoice.tax.percent}%)</span><span>{fmt(invoice.tax.amount)}</span></div>}
                  <div className="border-t pt-1 flex justify-between font-bold"><span>Total</span><span>{fmt(invoice.totalAmount)}</span></div>
                  <div className="flex justify-between text-green-700"><span>Paid</span><span>{fmt(invoice.amountPaid)}</span></div>
                  <div className="flex justify-between text-red-600 font-semibold"><span>Balance</span><span>{fmt(invoice.balanceDue)}</span></div>
                </div>
              </div>
            </section>

            {/* Payments */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Payment History</h2>
              {payments.length === 0 ? <p className="text-sm text-gray-500">No payments yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Method</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th><th className="p-2">Actions</th></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-t">
                        <td className="p-2">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                        <td className="p-2">{p.paymentMethod}</td>
                        <td className="p-2 text-right font-medium">{fmt(p.amount)}</td>
                        <td className="p-2"><StatusBadge status={p.status} /></td>
                        <td className="p-2">
                          {p.status === "Pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleVerifyPayment(p._id, "Verified")} className="text-green-700 text-xs font-medium hover:underline">Verify</button>
                              <button onClick={() => handleVerifyPayment(p._id, "Failed")} className="text-red-600 text-xs font-medium hover:underline">Fail</button>
                            </div>
                          )}
                          <a href={`http://localhost:3000/api/payments/${p._id}/receipt`} target="_blank" rel="noreferrer" className="text-purple-700 text-xs font-medium hover:underline block">Receipt</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add payment */}
              <form onSubmit={handleAddPayment} className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Amount *" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                <input type="date" className="border rounded-lg p-2 text-sm" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                <select className="border rounded-lg p-2 text-sm" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <input className="border rounded-lg p-2 text-sm" placeholder="Transaction ID" value={paymentForm.transactionId} onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} />
                <input className="border rounded-lg p-2 text-sm col-span-2" placeholder="Remarks" value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
                <button type="submit" className="col-span-2 bg-gray-900 text-white rounded-lg py-2 text-sm">Record Payment</button>
              </form>
            </section>

            {/* Work Timeline */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Work Timeline</h2>
              {timeline.length === 0 ? <p className="text-sm text-gray-500">No timeline entries yet.</p> : (
                <div className="space-y-3">
                  {timeline.map((t) => (
                    <div key={t._id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.newStatus} />
                        <span className="text-xs text-gray-500">{moment(t.timestamp).format("DD MMM YYYY hh:mm A")}</span>
                      </div>
                      {t.remark && <p className="text-sm text-gray-700 mt-1">{t.remark}</p>}
                      <p className="text-xs text-gray-500">by {t.updatedBy?.name || "System"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: Update Work Status */}
          <aside>
            <form onSubmit={handleProjectStatus} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Update Work Status</h2>
              <select className="w-full border rounded-lg p-2 text-sm" value={projectForm.projectStatus} onChange={(e) => setProjectForm({ ...projectForm, projectStatus: e.target.value })} required>
                <option value="">Select status</option>
                {WORK_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea className="w-full border rounded-lg p-2 text-sm" rows={3} placeholder="Remark" value={projectForm.remark} onChange={(e) => setProjectForm({ ...projectForm, remark: e.target.value })} />
              <input type="date" className="w-full border rounded-lg p-2 text-sm" placeholder="Expected Completion" value={projectForm.expectedCompletionDate} onChange={(e) => setProjectForm({ ...projectForm, expectedCompletionDate: e.target.value })} />
              <button type="submit" className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm">Update Status</button>
            </form>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetails;
