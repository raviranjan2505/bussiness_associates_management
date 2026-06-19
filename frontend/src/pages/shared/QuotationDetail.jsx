import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

const QuotationDetail = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((s) => s.user);
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [rejReason, setRejReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const isAdmin = currentUser?.role === "admin";
  const base = isAdmin ? "/admin" : "/associate";

  const load = () =>
    axiosInstance.get(`/quotations/${id}`).then((r) => setQ(r.data)).catch(console.error);

  useEffect(() => { load(); }, [id]);

  const send = async () => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const accept = async () => {
    try {
      const res = await axiosInstance.post(`/quotations/${id}/accept`);
      toast.success("Quotation accepted — invoice generated");
      navigate(`${base}/invoices/${res.data.invoice._id}`);
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const reject = async () => {
    if (!rejReason.trim()) return toast.error("Please provide a rejection reason");
    try {
      await axiosInstance.post(`/quotations/${id}/reject`, { rejectionReason: rejReason });
      toast.success("Quotation rejected");
      setShowRejectForm(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const downloadPdf = () =>
    window.open(`${axiosInstance.defaults.baseURL}/quotations/${id}/pdf`, "_blank");

  if (!q) return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6">Loading…</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{q.quotationNumber}</h1>
            <p className="text-sm text-gray-500">{q.customerName} · Created {moment(q.createdAt).format("DD MMM YYYY")}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={q.status} />
            <button onClick={downloadPdf} className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              Download PDF
            </button>
            {isAdmin && q.status === "Draft" && (
              <button onClick={send} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">Send to Associate</button>
            )}
            {!isAdmin && q.status === "Sent" && (
              <>
                <button onClick={accept} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm">Accept</button>
                <button onClick={() => setShowRejectForm(!showRejectForm)} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm">Reject</button>
              </>
            )}
          </div>
        </div>

        {/* Reject form */}
        {showRejectForm && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-rose-800">Please provide a reason for rejection:</p>
            <textarea className="w-full border rounded-lg p-3" rows={3} value={rejReason}
              onChange={(e) => setRejReason(e.target.value)} placeholder="Rejection reason…" />
            <div className="flex gap-2">
              <button onClick={reject} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm">Confirm Rejection</button>
              <button onClick={() => setShowRejectForm(false)} className="border border-gray-300 rounded-lg px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {q.rejectionReason && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-rose-800">Rejection Reason:</p>
            <p className="text-sm text-rose-700 mt-1">{q.rejectionReason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left: details */}
          <div className="xl:col-span-2 space-y-5">
            {/* Customer */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Customer Name"  value={q.customerName} />
                <Info label="Email"          value={q.customerEmail} />
                <Info label="Phone"          value={q.customerPhone} />
                <Info label="Associate"      value={q.associate?.name} />
                {q.validUntil && <Info label="Valid Until" value={moment(q.validUntil).format("DD MMM YYYY")} />}
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Services</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="p-3">Service</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.services?.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 text-right">{formatMoney(s.price)}</td>
                        <td className="p-3 text-right">{s.quantity}</td>
                        <td className="p-3 text-right">{formatMoney(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Notes */}
            {q.notes && (
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
                <p className="text-sm text-gray-700">{q.notes}</p>
              </section>
            )}
            {q.terms && (
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h2>
                <p className="text-sm text-gray-700">{q.terms}</p>
              </section>
            )}
          </div>

          {/* Right: totals */}
          <aside className="space-y-5">
            <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Summary</h2>
              <Row label="Subtotal" value={formatMoney(q.subtotal)} />
              {q.discount?.amount > 0 && <Row label="Discount" value={`- ${formatMoney(q.discount.amount)}`} />}
              {q.tax?.amount > 0 && <Row label={`Tax (${q.tax.percent}%)`} value={formatMoney(q.tax.amount)} />}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span>{formatMoney(q.totalAmount)}</span>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5 text-sm space-y-2">
              <h2 className="font-semibold text-gray-900 mb-3">Timeline</h2>
              {q.sentAt && <Info label="Sent" value={moment(q.sentAt).format("DD MMM YYYY hh:mm A")} />}
              {q.respondedAt && <Info label="Responded" value={moment(q.respondedAt).format("DD MMM YYYY hh:mm A")} />}
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value || "—"}</p>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default QuotationDetail;
