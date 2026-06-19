import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import ProjectTimelineView from "../../components/ProjectTimelineView";
import axiosInstance from "../../utils/axioInstance";
import { PROJECT_STATUS_DATA, PAYMENT_METHOD_DATA } from "../../utils/data";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const [projectForm, setProjectForm] = useState({ projectStatus: "", remark: "", startDate: "", expectedCompletionDate: "", deadline: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "", paymentDate: "" });

  const load = async () => {
    const res = await axiosInstance.get(`/invoices/${id}`);
    setInvoice(res.data.invoice);
    setPayments(res.data.payments || []);
    setTimeline(res.data.timeline || []);
    setProjectForm((f) => ({ ...f, projectStatus: res.data.invoice.projectStatus }));
  };

  useEffect(() => { load().catch(console.error); }, [id]);

  const updateProjectStatus = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/invoices/${id}/project-status`, projectForm);
      toast.success("Project status updated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/payments", { invoiceId: id, ...paymentForm });
      toast.success("Payment recorded");
      setPaymentForm({ amount: "", paymentMethod: "Bank Transfer", transactionId: "", remarks: "", paymentDate: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const verifyPayment = async (payId) => {
    try {
      await axiosInstance.post(`/payments/${payId}/verify`);
      toast.success("Payment verified");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const failPayment = async (payId) => {
    try {
      await axiosInstance.post(`/payments/${payId}/fail`);
      toast.success("Payment marked failed");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  if (!invoice) return <DashboardLayout activeMenu="Invoices"><div className="p-6">Loading...</div></DashboardLayout>;

  const inv = invoice;

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <button onClick={() => navigate("/admin/invoices")} className="text-sm text-blue-700 font-medium mb-1 block">← Back</button>
            <h1 className="text-2xl font-bold text-gray-900">{inv.invoiceNumber}</h1>
            <p className="text-sm text-gray-500">{inv.customerName} · {inv.associate?.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <StatusBadge status={inv.invoiceStatus} />
            <StatusBadge status={inv.projectStatus} />
            <a href={`http://localhost:3000/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Download PDF</a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-5">
            {/* Services table */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Services</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr><th className="p-3">Service</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {inv.services?.map((svc, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 font-medium">{svc.name}</td>
                      <td className="p-3 text-right">{fmt(svc.price)}</td>
                      <td className="p-3 text-right">{svc.quantity}</td>
                      <td className="p-3 text-right font-medium">{fmt(svc.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-5 border-t bg-gray-50 flex justify-end">
                <div className="space-y-1 text-sm min-w-[220px]">
                  <TRow label="Subtotal" value={fmt(inv.subtotal)} />
                  {inv.discount?.amount > 0 && <TRow label="Discount" value={`- ${fmt(inv.discount.amount)}`} />}
                  {inv.tax?.amount > 0 && <TRow label={`Tax (${inv.tax.percent}%)`} value={fmt(inv.tax.amount)} />}
                  <div className="border-t pt-1"><TRow label="Total" value={fmt(inv.totalAmount)} bold /></div>
                  <TRow label="Amount Paid" value={fmt(inv.amountPaid)} />
                  <TRow label="Balance Due" value={fmt(inv.balanceDue)} red />
                </div>
              </div>
            </section>

            {/* Payments table */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Payment History</h2></div>
              {payments.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr><th className="p-3">Date</th><th className="p-3">Method</th><th className="p-3">Txn ID</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-t">
                        <td className="p-3">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                        <td className="p-3">{p.paymentMethod}</td>
                        <td className="p-3 text-xs text-gray-500">{p.transactionId || "–"}</td>
                        <td className="p-3 font-medium">{fmt(p.amount)}</td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {p.status === "Pending" && (
                              <>
                                <button onClick={() => verifyPayment(p._id)} className="text-green-600 font-medium text-xs">Verify</button>
                                <button onClick={() => failPayment(p._id)} className="text-red-600 font-medium text-xs">Fail</button>
                              </>
                            )}
                            <a href={`http://localhost:3000/api/payments/${p._id}/receipt`} target="_blank" rel="noreferrer" className="text-gray-500 text-xs">Receipt</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-4 text-sm text-gray-500">No payments yet.</p>
              )}

              {/* Add payment form */}
              {!["Paid", "Cancelled"].includes(inv.invoiceStatus) && (
                <form onSubmit={addPayment} className="p-5 border-t grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input type="number" min="1" className="border rounded-lg p-2" placeholder="Amount (₹)" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                  <select className="border rounded-lg p-2" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    {PAYMENT_METHOD_DATA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <input className="border rounded-lg p-2" placeholder="Transaction ID (optional)" value={paymentForm.transactionId} onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} />
                  <input type="date" className="border rounded-lg p-2" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                  <input className="border rounded-lg p-2" placeholder="Remarks (optional)" value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
                  <button className="bg-gray-900 text-white rounded-lg px-4 py-2">Add Payment</button>
                </form>
              )}
            </section>
          </div>

          {/* Right: Project status + timeline */}
          <aside className="space-y-5">
            <section className="bg-white border border-gray-100 rounded-lg p-5 text-sm space-y-3">
              <h2 className="font-semibold text-gray-900">Invoice Info</h2>
              <Info label="Status" value={<StatusBadge status={inv.invoiceStatus} />} />
              <Info label="Due Date" value={inv.dueDate ? moment(inv.dueDate).format("DD MMM YYYY") : "–"} />
              {inv.quotation && <Info label="Quotation Ref" value={inv.quotation.quotationNumber} />}
              {inv.startDate && <Info label="Start Date" value={moment(inv.startDate).format("DD MMM YYYY")} />}
              {inv.expectedCompletionDate && <Info label="Expected Completion" value={moment(inv.expectedCompletionDate).format("DD MMM YYYY")} />}
              {inv.notes && <Info label="Notes" value={inv.notes} />}
            </section>

            <form onSubmit={updateProjectStatus} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Update Project Status</h2>
              <select className="w-full border rounded-lg p-2" value={projectForm.projectStatus} onChange={(e) => setProjectForm({ ...projectForm, projectStatus: e.target.value })}>
                {PROJECT_STATUS_DATA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <textarea className="w-full border rounded-lg p-2" rows={2} placeholder="Remark (optional)" value={projectForm.remark} onChange={(e) => setProjectForm({ ...projectForm, remark: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input type="date" className="w-full border rounded-lg p-2 mt-0.5" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Expected Completion</label>
                  <input type="date" className="w-full border rounded-lg p-2 mt-0.5" value={projectForm.expectedCompletionDate} onChange={(e) => setProjectForm({ ...projectForm, expectedCompletionDate: e.target.value })} />
                </div>
              </div>
              <button className="bg-gray-900 text-white rounded-lg px-4 py-2 w-full">Update Status</button>
            </form>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Project Timeline</h2>
              <ProjectTimelineView items={timeline} />
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase text-gray-400 font-medium">{label}</p>
    <div className="mt-0.5 text-gray-900">{value || "–"}</div>
  </div>
);

const TRow = ({ label, value, bold, red }) => (
  <div className={`flex justify-between ${bold ? "font-bold text-gray-900" : red ? "font-semibold text-red-600" : "text-gray-600"}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

export default InvoiceDetail;
