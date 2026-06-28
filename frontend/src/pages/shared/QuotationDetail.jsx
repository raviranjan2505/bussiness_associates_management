import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  const [invoice, setInvoice] = useState(null);       // created after accept
  const [rejReason, setRejReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [showEmailOverride, setShowEmailOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const base = isAdmin ? "/admin" : "/associate";
  const apiBase = axiosInstance.defaults.baseURL;

  const load = async () => {
    const res = await axiosInstance.get(`/quotations/${id}`);
    setQ(res.data);
    // If already accepted, try loading the linked invoice
    if (res.data.status === "Accepted") {
      const invId = res.data.invoiceId || res.data.invoice;
      if (invId) {
        axiosInstance.get(`/invoices/${invId}`).then((r) => setInvoice(r.data)).catch(() => {});
      }
    }
  };

  useEffect(() => { load().catch(console.error); }, [id]);

  // ── Admin: send to associate ─────────────────────────────────────────────
  const sendToAssociate = async () => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  // ── Associate: accept ────────────────────────────────────────────────────
  const accept = async () => {
    setAccepting(true);
    try {
      const res = await axiosInstance.post(`/quotations/${id}/accept`);
      toast.success("Quotation accepted — invoice generated");
      // stay on this page; fetch the invoice inline
      const inv = res.data.invoice || (Array.isArray(res.data.invoices) ? res.data.invoices[0] : null);
      if (inv) setInvoice(inv);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setAccepting(false);
    }
  };

  // ── Associate: reject ────────────────────────────────────────────────────
  const reject = async () => {
    if (!rejReason.trim()) return toast.error("Please provide a rejection reason");
    setRejecting(true);
    try {
      await axiosInstance.post(`/quotations/${id}/reject`, { rejectionReason: rejReason });
      toast.success("Quotation rejected");
      setShowRejectForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setRejecting(false);
    }
  };

  // ── Send quotation to client via email ───────────────────────────────────
  const sendQuotationToClient = async (emailOverride) => {
    setSendingToClient(true);
    try {
      const payload = emailOverride ? { email: emailOverride } : {};
      await axiosInstance.post(`/quotations/${id}/send-to-client`, payload);
      toast.success("Quotation emailed to client");
      setShowEmailOverride(false);
      setOverrideEmail("");
      load();
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to send email";
      if (msg.toLowerCase().includes("no client email")) setShowEmailOverride(true);
      toast.error(msg);
    } finally {
      setSendingToClient(false);
    }
  };

  if (!q) return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 text-gray-500">Loading…</div>
    </DashboardLayout>
  );

  const isAccepted = q.status === "Accepted";
  const isSent     = q.status === "Sent";
  const isDraft    = q.status === "Draft";
  const invoiceId  = invoice?._id || q.invoiceId || q.invoice;

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{q.quotationNumber}</h1>
            <p className="text-sm text-gray-500">
              {q.customerName} · {moment(q.createdAt).format("DD MMM YYYY")}
              {q.clientEmailSentAt && (
                <span className="ml-2 text-emerald-600 font-medium">
                  · Emailed to client {moment(q.clientEmailSentAt).format("DD MMM YYYY")}
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={q.status} />
        </div>

        {/* ── Action bar ── */}
        <div className="flex flex-wrap gap-2">

          {/* PDF downloads — always visible to anyone who can view */}
          <PdfButton href={`${apiBase}/quotations/${id}/pdf`} label="📄 Associate PDF" />
          <PdfButton href={`${apiBase}/quotations/${id}/pdf/client`} label="📄 Client PDF" />

          {/* Send to client — only meaningful after it has been accepted or at any time (admin & associate) */}
          {(isAccepted || isAdmin) && (
            <button
              onClick={() => sendQuotationToClient()}
              disabled={sendingToClient}
              className="border border-emerald-600 text-emerald-700 rounded-lg px-4 py-2 text-sm hover:bg-emerald-50 disabled:opacity-50"
            >
              {sendingToClient ? "Sending…" : "📧 Send Quotation to Client"}
            </button>
          )}

          {/* Admin: send draft to associate */}
          {isAdmin && isDraft && (
            <button
              onClick={sendToAssociate}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
            >
              Send to Associate
            </button>
          )}

          {/* Associate: accept / reject when quotation is Sent */}
          {!isAdmin && isSent && (
            <>
              <button
                onClick={accept}
                disabled={accepting}
                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {accepting ? "Accepting…" : "✓ Accept"}
              </button>
              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700"
              >
                ✕ Reject
              </button>
            </>
          )}
        </div>

        {/* ── Email override panel ── */}
        {showEmailOverride && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">
              No client email on record. Enter the email address to send to:
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 border rounded-lg p-2 text-sm"
                placeholder="client@example.com"
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
              />
              <button
                onClick={() => sendQuotationToClient(overrideEmail)}
                disabled={sendingToClient || !overrideEmail}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={() => setShowEmailOverride(false)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Reject form ── */}
        {showRejectForm && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-rose-800">Provide a reason for rejection:</p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm"
              rows={3}
              value={rejReason}
              onChange={(e) => setRejReason(e.target.value)}
              placeholder="Rejection reason…"
            />
            <div className="flex gap-2">
              <button
                onClick={reject}
                disabled={rejecting}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                {rejecting ? "Rejecting…" : "Confirm Rejection"}
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Rejection reason display ── */}
        {q.rejectionReason && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-rose-800">Rejection Reason</p>
            <p className="text-sm text-rose-700 mt-1">{q.rejectionReason}</p>
          </div>
        )}

        {/* ── Invoice banner — shown after acceptance ── */}
        {isAccepted && invoiceId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-emerald-800">✓ Invoice generated</p>
              <p className="text-sm text-emerald-700">
                {invoice?.invoiceNumber || "Invoice"} — Total: {formatMoney(invoice?.totalAmount)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`${base}/invoices/${invoiceId}`}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-emerald-700"
              >
                View Invoice
              </Link>
              <PdfButton href={`${apiBase}/invoices/${invoiceId}/pdf`} label="📄 Invoice (Associate)" />
              <PdfButton href={`${apiBase}/invoices/${invoiceId}/pdf/client`} label="📄 Invoice (Client)" />
            </div>
          </div>
        )}

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

          {/* Left col */}
          <div className="xl:col-span-2 space-y-5">

            {/* Customer */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Customer Name" value={q.customerName} />
                <Info label="Email"         value={q.customerEmail} />
                <Info label="Phone"         value={q.customerPhone} />
                <Info label="Associate"     value={q.associate?.name} />
                {q.validUntil && <Info label="Valid Until" value={moment(q.validUntil).format("DD MMM YYYY")} />}
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="font-semibold text-gray-900">Services</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="p-3">Service</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right text-green-700">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.services?.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 text-right">{formatMoney(s.price)}</td>
                        <td className="p-3 text-right">{s.quantity}</td>
                        <td className="p-3 text-right">{formatMoney(s.amount)}</td>
                        <td className="p-3 text-right text-green-700 font-medium">
                          {s.associateEarningAmount > 0
                            ? formatMoney(s.associateEarningAmount)
                            : s.associateEarningPercent > 0
                            ? `${s.associateEarningPercent}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                    <tr>
                      <td className="p-3 text-gray-700" colSpan={3}>Total</td>
                      <td className="p-3 text-right text-gray-900">
                        {formatMoney((q.services || []).reduce((sum, s) => sum + Number(s.amount || 0), 0))}
                      </td>
                      <td className="p-3 text-right text-green-700">
                        {formatMoney((q.services || []).reduce((sum, s) => sum + Number(s.associateEarningAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

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

          {/* Right col: summary + timeline */}
          <aside className="space-y-5">
            <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Summary</h2>
              <Row label="Subtotal" value={formatMoney(q.subtotal)} />
              {q.discount?.amount > 0 && <Row label="Discount" value={`- ${formatMoney(q.discount.amount)}`} />}
              {q.tax?.amount > 0 && <Row label={`Tax (${q.tax.percent}%)`} value={formatMoney(q.tax.amount)} />}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span>{formatMoney(q.totalAmount)}</span>
              </div>
              {q.associateEarningAmount > 0 && (
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-medium">Your Commission</span>
                    <span className="font-bold text-green-700">{formatMoney(q.associateEarningAmount)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Earned on acceptance</p>
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-2">
              <h2 className="font-semibold text-gray-900 mb-3">Timeline</h2>
              {q.createdAt && <Info label="Created"   value={moment(q.createdAt).format("DD MMM YYYY, h:mm A")} />}
              {q.sentAt     && <Info label="Sent"      value={moment(q.sentAt).format("DD MMM YYYY, h:mm A")} />}
              {q.respondedAt && <Info label="Responded" value={moment(q.respondedAt).format("DD MMM YYYY, h:mm A")} />}
              {q.clientEmailSentAt && <Info label="Emailed to client" value={moment(q.clientEmailSentAt).format("DD MMM YYYY, h:mm A")} />}
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const PdfButton = ({ href, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 inline-block"
  >
    {label}
  </a>
);

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="font-medium text-gray-900 mt-1">{value || "—"}</p>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default QuotationDetail;