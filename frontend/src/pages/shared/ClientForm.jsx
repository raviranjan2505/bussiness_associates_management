import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const EMPTY = {
  clientName: "",
  mobileNumber: "",
  email: "",
  address: "",
  clientType: "Individual",
  aadhaarNumber: "",
  pan: "",
};

// ── Inline validation (mirrors backend rules) ─────────────────────────────
const validate = (f) => {
  const e = {};
  if (!f.clientName.trim()) e.clientName = "Full name is required.";
  if (!f.mobileNumber.trim()) e.mobileNumber = "Mobile number is required.";
  else if (!/^[0-9]{10}$/.test(f.mobileNumber.trim())) e.mobileNumber = "Must be exactly 10 digits.";
  if (!f.aadhaarNumber.trim()) e.aadhaarNumber = "Aadhaar number is required.";
  else if (!/^[0-9]{12}$/.test(f.aadhaarNumber.trim())) e.aadhaarNumber = "Must be exactly 12 digits.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Invalid email address.";
  if (f.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(f.pan.trim())) e.pan = "Invalid PAN format (e.g. ABCDE1234F).";
  return e;
};

const ClientForm = () => {
  const { id } = useParams();           // present on edit route
  const isEdit = Boolean(id);
  const { currentUser } = useSelector((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const base = isAdmin ? "/admin" : "/associate";
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Load existing client data when editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await axiosInstance.get(`/business/clients/${id}`);
        const c = res.data.client;
        setForm({
          clientName: c.clientName || "",
          mobileNumber: c.mobileNumber || "",
          email: c.email || "",
          address: c.address || "",
          clientType: c.clientType || "Individual",
          aadhaarNumber: c.aadhaarNumber || "",
          pan: c.pan || "",
        });
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load client");
        navigate(`${base}/clients`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        await axiosInstance.put(`/business/clients/${id}`, form);
        toast.success("Client updated successfully");
      } else {
        await axiosInstance.post("/business/clients", form);
        toast.success("Client added successfully");
      }
      navigate(`${base}/clients`);
    } catch (e) {
      const msg = e.response?.data?.message || (isEdit ? "Failed to update client" : "Failed to add client");
      // Show field-level error for duplicate mobile
      if (msg.toLowerCase().includes("mobile")) {
        setErrors((prev) => ({ ...prev, mobileNumber: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="Client List">
        <div className="flex items-center justify-center p-12 text-gray-400">Loading client…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="Client List">
      <div className="p-6 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link to={`${base}/clients`} className="text-sm text-blue-700 font-medium hover:underline">
            ← Back to Client List
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Client" : "Add New Client"}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? "Update client information below." : "Fill in the details to register a new client."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">

          {/* Full Name */}
          <Field label="Full Name" required error={errors.clientName}>
            <input
              type="text"
              placeholder="e.g. Ravi Kumar"
              value={form.clientName}
              onChange={set("clientName")}
              className={input(errors.clientName)}
            />
          </Field>

          {/* Mobile & Email */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Mobile Number" required error={errors.mobileNumber}
              hint="10-digit Indian mobile number">
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={form.mobileNumber}
                onChange={set("mobileNumber")}
                className={input(errors.mobileNumber)}
              />
            </Field>
            <Field label="Email Address" error={errors.email}>
              <input
                type="email"
                placeholder="client@example.com"
                value={form.email}
                onChange={set("email")}
                className={input(errors.email)}
              />
            </Field>
          </div>

          {/* Address */}
          <Field label="Address" error={errors.address}>
            <textarea
              rows={2}
              placeholder="Street, City, State, PIN"
              value={form.address}
              onChange={set("address")}
              className={input(errors.address)}
            />
          </Field>

          {/* Client Type */}
          <Field label="Client Type" required>
            <div className="flex gap-4 pt-1">
              {["Individual", "Business"].map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="clientType"
                    value={type}
                    checked={form.clientType === type}
                    onChange={set("clientType")}
                    className="accent-gray-900"
                  />
                  {type}
                </label>
              ))}
            </div>
          </Field>

          {/* Aadhaar & PAN */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Aadhaar Number" required error={errors.aadhaarNumber}
              hint="12-digit Aadhaar number">
              <input
                type="text"
                maxLength={12}
                placeholder="123456789012"
                value={form.aadhaarNumber}
                onChange={set("aadhaarNumber")}
                className={input(errors.aadhaarNumber)}
              />
            </Field>
            <Field label="PAN Number" error={errors.pan}
              hint="Optional — format: ABCDE1234F">
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={form.pan}
                onChange={(e) => {
                  setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }));
                  if (errors.pan) setErrors((p) => ({ ...p, pan: undefined }));
                }}
                className={input(errors.pan)}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting
                ? isEdit ? "Saving…" : "Adding…"
                : isEdit ? "Save Changes" : "Add Client"}
            </button>
            <Link
              to={`${base}/clients`}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────
const input = (err) =>
  `w-full rounded-lg border p-2.5 text-sm focus:outline-none focus:ring-1 transition-colors ${
    err
      ? "border-red-400 bg-red-50 focus:ring-red-300"
      : "border-gray-200 focus:border-gray-400 focus:ring-gray-200"
  }`;

const Field = ({ label, required, error, hint, children }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default ClientForm;