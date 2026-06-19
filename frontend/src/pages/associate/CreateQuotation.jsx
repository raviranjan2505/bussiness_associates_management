import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const CreateQuotation = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [customer, setCustomer] = useState({ customerName: "", customerEmail: "", customerPhone: "" });
  const [lines, setLines] = useState([{ service: "", name: "", price: "", quantity: 1 }]);
  const [extras, setExtras] = useState({ discountType: "flat", discountValue: 0, taxPercent: 0, notes: "", terms: "", validUntil: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosInstance.get("/business/services").then((r) => setServices(r.data.services || [])).catch(console.error);
  }, []);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 1), 0);
  const discountAmt = extras.discountType === "percentage" ? (subtotal * extras.discountValue) / 100 : Number(extras.discountValue) || 0;
  const taxAmt = ((subtotal - discountAmt) * extras.taxPercent) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const handleServiceChange = (i, serviceId) => {
    const svc = services.find((s) => s._id === serviceId);
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, service: serviceId, name: svc?.name || "", price: svc?.price || "" } : l));
  };

  const addLine = () => setLines((prev) => [...prev, { service: "", name: "", price: "", quantity: 1 }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.customerName) { toast.error("Customer name is required"); return; }
    const validLines = lines.filter((l) => l.name && l.price);
    if (!validLines.length) { toast.error("Add at least one service"); return; }
    setLoading(true);
    try {
      const payload = {
        ...customer,
        services: validLines.map((l) => ({
          service: l.service || undefined,
          name: l.name,
          price: Number(l.price),
          quantity: Number(l.quantity) || 1,
          amount: (Number(l.price) || 0) * (Number(l.quantity) || 1),
        })),
        discount: { type: extras.discountType, value: Number(extras.discountValue) || 0 },
        tax: { percent: Number(extras.taxPercent) || 0 },
        notes: extras.notes,
        terms: extras.terms,
        validUntil: extras.validUntil || undefined,
      };
      const res = await axiosInstance.post("/quotations", payload);
      toast.success("Quotation draft created");
      navigate(`/associate/quotations/${res.data.quotation._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-700 mb-1">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Quotation</h1>
          <p className="text-sm text-gray-500">Select services and add customer details.</p>
        </div>

        {/* Customer */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Customer Details</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="border rounded-lg p-3 text-sm" placeholder="Customer Name *" required value={customer.customerName} onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} />
            <input type="email" className="border rounded-lg p-3 text-sm" placeholder="Email" value={customer.customerEmail} onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })} />
            <input className="border rounded-lg p-3 text-sm" placeholder="Phone" value={customer.customerPhone} onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })} />
          </div>
        </section>

        {/* Services */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Services</h2>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_auto] items-center">
              <select className="border rounded-lg p-2 text-sm" value={line.service} onChange={(e) => handleServiceChange(i, e.target.value)}>
                <option value="">— Custom / Select Service —</option>
                {services.map((s) => <option key={s._id} value={s._id}>{s.name} (₹{s.price})</option>)}
              </select>
              <input className="border rounded-lg p-2 text-sm" placeholder="Service name" value={line.name} onChange={(e) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l))} />
              <div className="grid grid-cols-2 gap-1">
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Price" min="0" value={line.price} onChange={(e) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, price: e.target.value } : l))} />
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Qty" min="1" value={line.quantity} onChange={(e) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, quantity: e.target.value } : l))} />
              </div>
              {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-500 text-sm px-2">✕</button>}
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-blue-700 text-sm font-medium">+ Add Service Line</button>

          {/* Totals Preview */}
          <div className="border-t pt-3 mt-3 text-sm max-w-xs ml-auto space-y-1">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-₹{discountAmt.toFixed(2)}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between"><span>Tax</span><span>₹{taxAmt.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>
        </section>

        {/* Discount & Tax */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Discount & Tax</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex gap-2">
              <select className="border rounded-lg p-2 text-sm flex-none" value={extras.discountType} onChange={(e) => setExtras({ ...extras, discountType: e.target.value })}>
                <option value="flat">Flat (Rs.)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input type="number" min="0" className="border rounded-lg p-2 text-sm w-full" placeholder="Discount" value={extras.discountValue} onChange={(e) => setExtras({ ...extras, discountValue: e.target.value })} />
            </div>
            <input type="number" min="0" max="100" className="border rounded-lg p-2 text-sm" placeholder="Tax %" value={extras.taxPercent} onChange={(e) => setExtras({ ...extras, taxPercent: e.target.value })} />
            <input type="date" className="border rounded-lg p-2 text-sm" placeholder="Valid Until" value={extras.validUntil} onChange={(e) => setExtras({ ...extras, validUntil: e.target.value })} />
          </div>
        </section>

        {/* Notes & Terms */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Notes & Terms</h2>
          <textarea className="w-full border rounded-lg p-3 text-sm" rows={3} placeholder="Notes..." value={extras.notes} onChange={(e) => setExtras({ ...extras, notes: e.target.value })} />
          <textarea className="w-full border rounded-lg p-3 text-sm" rows={3} placeholder="Terms & Conditions..." value={extras.terms} onChange={(e) => setExtras({ ...extras, terms: e.target.value })} />
        </section>

        <button type="submit" disabled={loading} className="bg-gray-900 text-white rounded-lg px-6 py-3 font-medium disabled:opacity-50">
          {loading ? "Creating..." : "Create Quotation Draft"}
        </button>
      </form>
    </DashboardLayout>
  );
};

export default CreateQuotation;
