import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { updateUserProfileSuccess } from "../../redux/slice/userSlice";

const emptyForm = {
  fullName: "",
  mobile: "",
  email: "",
  address: "",
  aadhaarNumber: "",
  panNumber: "",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
};

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

const StatusBanner = ({ status, rejectionReason }) => {
  if (status === "Approved") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        <p className="font-semibold">✓ KYC Approved</p>
        <p className="text-sm mt-1">Your KYC has been verified. You now have full access to all modules.</p>
      </div>
    );
  }
  if (status === "Rejected") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">✕ KYC Rejected</p>
        {rejectionReason && <p className="text-sm mt-1">Reason: {rejectionReason}</p>}
        <p className="text-sm mt-1">Please correct the details below and resubmit.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
      <p className="font-semibold">⏳ KYC Pending Review</p>
      <p className="text-sm mt-1">
        Your KYC has been submitted and is awaiting admin approval. You'll get full access once it's approved.
      </p>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border rounded-lg p-2.5 disabled:bg-gray-50 disabled:text-gray-500";

const SubmitKyc = () => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kyc, setKyc] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({ aadhaarCard: null, panCard: null, bankProof: null });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/kyc/me");
      const existing = res.data.kyc;
      setStatus(res.data.kycStatus || "Pending");
      setKyc(existing);
      if (existing) {
        setForm({
          fullName: existing.fullName || "",
          mobile: existing.mobile || "",
          email: existing.email || "",
          address: existing.address || "",
          aadhaarNumber: existing.aadhaarNumber || "",
          panNumber: existing.panNumber || "",
          accountHolderName: existing.bankDetails?.accountHolderName || "",
          bankName: existing.bankDetails?.bankName || "",
          accountNumber: existing.bankDetails?.accountNumber || "",
          ifscCode: existing.bankDetails?.ifscCode || "",
          upiId: existing.bankDetails?.upiId || "",
        });
      } else {
        setForm((prev) => ({ ...prev, fullName: currentUser?.name || "", email: currentUser?.email || "" }));
      }
    } catch (e) {
      toast.error("Failed to load KYC details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editable only when there's no submission yet, or the last one was rejected.
  const isEditable = !kyc || status === "Rejected";

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleFile = (field) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      toast.error("File size must be under 5MB");
      e.target.value = "";
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditable) return;

    if (!kyc && (!files.aadhaarCard || !files.panCard || !files.bankProof)) {
      toast.error("Please upload Aadhaar Card, PAN Card, and Bank Proof documents");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (files.aadhaarCard) fd.append("aadhaarCard", files.aadhaarCard);
      if (files.panCard) fd.append("panCard", files.panCard);
      if (files.bankProof) fd.append("bankProof", files.bankProof);

      await axiosInstance.post("/kyc/submit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("KYC submitted successfully");
      dispatch(updateUserProfileSuccess({ kycStatus: "Pending" }));
      setFiles({ aadhaarCard: null, panCard: null, bankProof: null });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Submit KYC">
      <div className="p-6 space-y-5 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit KYC</h1>
          <p className="text-sm text-gray-500">
            Complete your KYC to unlock full access to the Associate panel.
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-gray-400">
            Loading…
          </div>
        ) : (
          <>
            {kyc && <StatusBanner status={status} rejectionReason={kyc.rejectionReason} />}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Personal Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Full Name">
                    <input className={inputClass} value={form.fullName} disabled={!isEditable}
                      onChange={handleChange("fullName")} required />
                  </Field>
                  <Field label="Mobile Number">
                    <input className={inputClass} value={form.mobile} disabled={!isEditable}
                      onChange={handleChange("mobile")} placeholder="10-digit mobile number" required />
                  </Field>
                  <Field label="Email ID">
                    <input type="email" className={inputClass} value={form.email} disabled={!isEditable}
                      onChange={handleChange("email")} required />
                  </Field>
                  <Field label="Address">
                    <input className={inputClass} value={form.address} disabled={!isEditable}
                      onChange={handleChange("address")} required />
                  </Field>
                </div>
              </section>

              {/* Identity Details */}
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Identity Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Aadhaar Number">
                    <input className={inputClass} value={form.aadhaarNumber} disabled={!isEditable}
                      onChange={handleChange("aadhaarNumber")} placeholder="12-digit Aadhaar number" required />
                  </Field>
                  <Field label="PAN Number">
                    <input className={inputClass} value={form.panNumber} disabled={!isEditable}
                      onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F" required />
                  </Field>
                </div>
              </section>

              {/* Bank Details */}
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Bank Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Account Holder Name">
                    <input className={inputClass} value={form.accountHolderName} disabled={!isEditable}
                      onChange={handleChange("accountHolderName")} required />
                  </Field>
                  <Field label="Bank Name">
                    <input className={inputClass} value={form.bankName} disabled={!isEditable}
                      onChange={handleChange("bankName")} required />
                  </Field>
                  <Field label="Account Number">
                    <input className={inputClass} value={form.accountNumber} disabled={!isEditable}
                      onChange={handleChange("accountNumber")} required />
                  </Field>
                  <Field label="IFSC Code">
                    <input className={inputClass} value={form.ifscCode} disabled={!isEditable}
                      onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="ABCD0123456" required />
                  </Field>
                  <Field label="UPI ID (optional)">
                    <input className={inputClass} value={form.upiId} disabled={!isEditable}
                      onChange={handleChange("upiId")} placeholder="name@upi" />
                  </Field>
                </div>
              </section>

              {/* Document Uploads */}
              <section className="bg-white border border-gray-100 rounded-lg p-5">
                <h2 className="font-semibold text-gray-900 mb-1">Document Uploads</h2>
                <p className="text-xs text-gray-500 mb-4">Accepted formats: JPG, PNG, PDF (max 5MB each)</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { key: "aadhaarCard", label: "Aadhaar Card" },
                    { key: "panCard", label: "PAN Card" },
                    { key: "bankProof", label: "Bank Passbook / Cancelled Cheque" },
                  ].map(({ key, label }) => (
                    <Field key={key} label={label}>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        disabled={!isEditable}
                        onChange={handleFile(key)}
                        className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-50"
                      />
                      {kyc?.documents?.[key]?.url && (
                        <a
                          href={kyc.documents[key].url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                        >
                          View previously uploaded file
                        </a>
                      )}
                    </Field>
                  ))}
                </div>
              </section>

              {isEditable && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gray-900 text-white rounded-lg px-6 py-3 font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : kyc ? "Resubmit KYC" : "Submit KYC"}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubmitKyc;