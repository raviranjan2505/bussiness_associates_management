import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const Row = ({ label, value }) => (
  <div className="py-2 border-b border-gray-100 last:border-0">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="font-medium text-gray-900 mt-0.5">{value || "—"}</p>
  </div>
);

const DocCard = ({ label, doc }) => (
  <div className="border rounded-lg p-4 flex flex-col gap-2">
    <p className="text-sm font-medium text-gray-700">{label}</p>
    {doc?.url ? (
      <a
        href={doc.url}
        target="_blank"
        rel="noreferrer"
        className="text-blue-700 text-sm font-medium hover:underline"
      >
        View / Download
      </a>
    ) : (
      <p className="text-sm text-gray-400">Not uploaded</p>
    )}
  </div>
);

const KycDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [associate, setAssociate] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/kyc/${userId}`);
      setAssociate(res.data.associate);
      setKyc(res.data.kyc);
    } catch (e) {
      toast.error("Failed to load KYC details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const approve = async () => {
    setActing(true);
    try {
      await axiosInstance.post(`/kyc/${userId}/approve`);
      toast.success("KYC approved");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve KYC");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    const rejectionReason = window.prompt("Reason for rejecting this KYC:");
    if (rejectionReason === null) return;
    if (!rejectionReason.trim()) return toast.error("Rejection reason is required");
    setActing(true);
    try {
      await axiosInstance.post(`/kyc/${userId}/reject`, { rejectionReason });
      toast.success("KYC rejected");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reject KYC");
    } finally {
      setActing(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Permanently delete associate "${associate?.name}"? This cannot be undone.`)) return;
    setActing(true);
    try {
      await axiosInstance.delete(`/kyc/associate/${userId}`);
      toast.success("Associate deleted");
      navigate("/admin/kyc-requests");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete associate");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="KYC Requests">
        <div className="p-6 text-center text-gray-400">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!associate) {
    return (
      <DashboardLayout activeMenu="KYC Requests">
        <div className="p-6 text-center text-gray-500">Associate not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="KYC Requests">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{associate.name}</h1>
            <p className="text-sm text-gray-500">{associate.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Registered on {moment(associate.createdAt).format("DD MMM YYYY")}
            </p>
          </div>
          <StatusBadge status={associate.kycStatus} />
        </div>

        {!kyc ? (
          <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-gray-500">
            This associate has not submitted their KYC yet.
          </div>
        ) : (
          <>
            {kyc.status === "Rejected" && kyc.rejectionReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
                <span className="font-semibold">Rejection reason: </span>
                {kyc.rejectionReason}
              </div>
            )}

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Personal Details</h2>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Row label="Full Name" value={kyc.fullName} />
                <Row label="Mobile Number" value={kyc.mobile} />
                <Row label="Email ID" value={kyc.email} />
                <Row label="Address" value={kyc.address} />
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Identity Details</h2>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Row label="Aadhaar Number" value={kyc.aadhaarNumber} />
                <Row label="PAN Number" value={kyc.panNumber} />
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Bank Details</h2>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Row label="Account Holder Name" value={kyc.bankDetails?.accountHolderName} />
                <Row label="Bank Name" value={kyc.bankDetails?.bankName} />
                <Row label="Account Number" value={kyc.bankDetails?.accountNumber} />
                <Row label="IFSC Code" value={kyc.bankDetails?.ifscCode} />
                <Row label="UPI ID" value={kyc.bankDetails?.upiId} />
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DocCard label="Aadhaar Card" doc={kyc.documents?.aadhaarCard} />
                <DocCard label="PAN Card" doc={kyc.documents?.panCard} />
                <DocCard label="Bank Passbook / Cancelled Cheque" doc={kyc.documents?.bankProof} />
              </div>
            </section>

            {kyc.reviewedBy && (
              <p className="text-xs text-gray-400">
                Last reviewed by {kyc.reviewedBy.name} on {moment(kyc.reviewedAt).format("DD MMM YYYY, h:mm A")}
              </p>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          {kyc?.status === "Pending" && (
            <>
              <button
                onClick={approve}
                disabled={acting}
                className="bg-green-600 text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
              >
                ✓ Approve KYC
              </button>
              <button
                onClick={reject}
                disabled={acting}
                className="bg-red-600 text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
              >
                ✕ Reject KYC
              </button>
            </>
          )}
          <button
            onClick={remove}
            disabled={acting}
            className="border border-gray-300 text-gray-700 rounded-lg px-5 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Delete Associate
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KycDetails;