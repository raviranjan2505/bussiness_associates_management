import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Landmark, QrCode } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const EMPTY_FORM = {
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
};

const AdminPaymentSettings = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [qrPreview, setQrPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/payment-settings");
      const s = res.data.settings || {};
      setForm({
        bankName: s.bankName || "",
        accountHolderName: s.accountHolderName || "",
        accountNumber: s.accountNumber || "",
        ifscCode: s.ifscCode || "",
        upiId: s.upiId || "",
      });
      setQrCodeUrl(s.qrCodeUrl || "");
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleQrChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setQrCodeFile(file);
    setQrPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (qrCodeFile) data.append("qrCode", qrCodeFile);

      const res = await axiosInstance.put("/payment-settings", data);
      toast.success("Payment settings updated");
      setQrCodeUrl(res.data.settings?.qrCodeUrl || qrCodeUrl);
      setQrCodeFile(null);
      setQrPreview("");
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Payment Settings">
      <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            These details are shown to every associate on their Work Details page, so they know where to send payment.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-6">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Landmark className="h-5 w-5 text-blue-600" />
              Bank &amp; UPI Details
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                <input
                  className="w-full border rounded-lg p-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder Name</label>
                <input
                  className="w-full border rounded-lg p-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  value={form.accountHolderName}
                  onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  placeholder="e.g. Indian Money Master Pvt Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                <input
                  className="w-full border rounded-lg p-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="e.g. 123456789012"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code</label>
                <input
                  className="w-full border rounded-lg p-2.5 text-sm uppercase focus:border-gray-400 focus:outline-none"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID</label>
                <input
                  className="w-full border rounded-lg p-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="e.g. company@okicici"
                />
              </div>
            </div>

            <div className="border-t pt-5">
              <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                <QrCode className="h-5 w-5 text-purple-600" />
                Payment QR Code
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {qrPreview || qrCodeUrl ? (
                    <img src={qrPreview || qrCodeUrl} alt="Payment QR code" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">No QR code uploaded</span>
                  )}
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={handleQrChange} className="text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Upload a PNG or JPG of your payment QR code.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Payment Settings"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPaymentSettings;
