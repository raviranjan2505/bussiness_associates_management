import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const Row = ({ label, value, green }) => (
  <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`font-medium ${green ? "text-green-700" : "text-gray-900"}`}>{value || "—"}</span>
  </div>
);

const ManagePayout = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ transactionRef: "", remarks: "", paidAt: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/payouts/admin/invoice/${invoiceId}/payout`);
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load payout details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [invoiceId]);

  const markPaid = async (e) => {
    e.preventDefault();
    if (!form.transactionRef.trim()) { toast.error("Transaction reference is required"); return; }
    setSubmitting(true);
    try {
      await axiosInstance.patch(`/payouts/admin/payout/${data.payout._id}/mark-paid`, form);
      toast.success("Payout marked as paid");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to mark payout as paid");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <DashboardLayout activeMenu="Income">
      <div className="flex items-center justify-center p-12 text-gray-400">Loading payout details…</div>
    </DashboardLayout>
  );

  if (!data) return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 text-gray-500">Payout record not found.</div>
    </DashboardLayout>
  );

  const { associate, invoice, work, payout, payments, summary } = data;
  const isPaid = payout.status === "Paid";

  return (
    <DashboardLayout activeMenu="Income">
      <div className="p-6 max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-700 hover:underline font-medium">
            ← Back
          </button>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">Manage Payout</h1>
          <p className="text-sm text-gray-500">Invoice {invoice.invoiceNumber} · {invoice.customerName}</p>
        </div>

        {/* Payout status banner */}
        {isPaid ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Payout Completed</p>
              <p className="text-sm text-green-700">
                Paid {fmt(payout.payoutAmount)} on {moment(payout.paidAt).format("DD MMM YYYY")}
                {payout.transactionRef && ` · Ref: ${payout.transactionRef}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-orange-800">Payout Due</p>
              <p className="text-sm text-orange-700">
                {fmt(payout.payoutAmount)} is pending for this work.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Associate Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Associate Details</h2>
            <Row label="Name"   value={associate.name} />
            <Row label="Mobile" value={associate.mobileNumber} />
            <Row label="Email"  value={associate.email} />
          </div>

          {/* Bank Account Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Bank Account Details</h2>
            {associate.bankDetails?.accountNumber ? (
              <>
                <Row label="Account Holder" value={associate.bankDetails.accountHolderName} />
                <Row label="Bank"           value={associate.bankDetails.bankName} />
                <Row label="Account No."    value={associate.bankDetails.accountNumber} />
                <Row label="IFSC Code"      value={associate.bankDetails.ifscCode} />
                {associate.bankDetails.upiId && <Row label="UPI ID" value={associate.bankDetails.upiId} />}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">No bank details on file.</p>
            )}
          </div>
        </div>

        {/* Work Details */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Work & Invoice Details</h2>
          <Row label="Work ID"         value={work.workId} />
          <Row label="Client Name"     value={invoice.customerName} />
          <Row label="Service"         value={work.serviceName} />
          <Row label="Invoice Number"  value={invoice.invoiceNumber} />
          <Row label="Total Amount"    value={fmt(invoice.totalAmount)} />
          <Row label="Amount Received" value={fmt(invoice.amountReceived)} green />
          <Row label="Payment Date"    value={invoice.paymentDate ? moment(invoice.paymentDate).format("DD MMM YYYY") : null} />
          <Row label="Payout Amount"   value={fmt(payout.payoutAmount)} green />
          <Row label="Payout Status"   value={payout.status} />
          {isPaid && <>
            <Row label="Payout Date"      value={payout.paidAt ? moment(payout.paidAt).format("DD MMM YYYY") : null} />
            <Row label="Transaction Ref." value={payout.transactionRef} />
            {payout.remarks && <Row label="Remarks" value={payout.remarks} />}
          </>}
        </div>

        {/* Payout Summary */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Associate Payout Summary</h2>
          <Row label="Total Service Charge" value={fmt(summary.totalIncome)} />
          <Row label="Total Commission"        value={fmt(summary.totalCommission)} />
          <Row label="Total Payout Paid"       value={fmt(summary.totalPayoutPaid)} green />
          <Row label="Current Payout Due"      value={fmt(summary.currentPayoutDue)} />
          <Row label="Remaining Balance"       value={fmt(summary.remainingBalance)} />
        </div>

        {/* Mark as Paid form */}
        {!isPaid && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Mark Payout as Paid</h2>
            <form onSubmit={markPaid} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Reference <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2.5 text-sm"
                    placeholder="e.g. TXN123456789"
                    value={form.transactionRef}
                    onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5 text-sm"
                    value={form.paidAt}
                    onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg p-2.5 text-sm"
                  placeholder="Any notes about this payout…"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {submitting ? "Saving…" : `✓ Mark as Paid — ${fmt(payout.payoutAmount)}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagePayout;