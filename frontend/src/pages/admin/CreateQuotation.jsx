import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

const CreateQuotation = () => {
  const navigate = useNavigate();
  const [associates, setAssociates] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState({
    associate: "",
    clientId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
    terms: "",
    validUntil: "",
  });
  const [discount, setDiscount] = useState({ type: "flat", value: 0 });
  const [tax, setTax] = useState({ percent: 0 });

  useEffect(() => {
    axiosInstance.get("/users/get-users").then((r) => setAssociates(Array.isArray(r.data) ? r.data : [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.associate) {
      setClients([]); setLeads([]); setSelectedLeadIds([]); setSelectedClient(null);
      setForm((p) => ({ ...p, clientId: "", customerName: "", customerEmail: "", customerPhone: "" }));
      return;
    }
    setLoadingClients(true);
    axiosInstance.get("/business/clients", { params: { associate: form.associate } })
      .then((r) => setClients(r.data.clients || []))
      .catch(console.error)
      .finally(() => setLoadingClients(false));
    setLeads([]); setSelectedLeadIds([]); setSelectedClient(null);
    setForm((p) => ({ ...p, clientId: "", customerName: "", customerEmail: "", customerPhone: "" }));
  }, [form.associate]);

  useEffect(() => {
    if (!form.clientId) {
      setSelectedClient(null); setLeads([]); setSelectedLeadIds([]);
      setForm((p) => ({ ...p, customerName: "", customerEmail: "", customerPhone: "" }));
      return;
    }
    const client = clients.find((c) => String(c.clientId || c.clientKey) === String(form.clientId)) || null;
    setSelectedClient(client);
    if (!client) return;
    setForm((p) => ({
      ...p,
      customerName: client.clientName || "",
      customerEmail: client.email || "",
      customerPhone: client.mobileNumber || "",
    }));
    setSelectedLeadIds([]);
    setLoadingLeads(true);
    axiosInstance.get("/leads", { params: { associate: form.associate, clientId: form.clientId } })
      .then((r) => setLeads(r.data.leads || []))
      .catch(console.error)
      .finally(() => setLoadingLeads(false));
  }, [form.clientId, clients, form.associate]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedLeadIds.includes(l._id)),
    [leads, selectedLeadIds]
  );

  // Build service lines — supports both multi-service leads (lead.services[]) and legacy single-service leads
  const serviceLines = useMemo(() => {
    const lines = [];
    selectedLeads.forEach((lead) => {
      // Multi-service lead
      if (Array.isArray(lead.services) && lead.services.length > 0) {
        lead.services.forEach((svc) => {
          lines.push({
            leadRef: lead.leadId,
            service: svc.service,
            name: svc.name,
            description: `Lead ${lead.leadId}`,
            price: Number(svc.price || 0),
            quantity: Number(svc.quantity || 1),
            amount: Number(svc.amount || svc.price || 0),
            associateEarningPercent: Number(svc.associateEarningPercent || 0),
            associateEarningAmount: Number(svc.associateEarningAmount || 0),
          });
        });
      } else {
        // Legacy single-service lead
        const price = Number(lead.servicePrice ?? lead.service?.price ?? 0);
        lines.push({
          leadRef: lead.leadId,
          service: lead.service?._id,
          name: lead.service?.name || `Lead ${lead.leadId}`,
          description: `Lead ${lead.leadId}`,
          price,
          quantity: 1,
          amount: price,
          associateEarningPercent: Number(lead.associateEarningPercent || 0),
          associateEarningAmount: Number(lead.associateEarningAmount || 0),
        });
      }
    });
    return lines;
  }, [selectedLeads]);

  const subtotal      = serviceLines.reduce((s, l) => s + l.amount, 0);
  const totalCommission = serviceLines.reduce((s, l) => s + l.associateEarningAmount, 0);
  const discountAmt   = discount.type === "percentage"
    ? (subtotal * (Number(discount.value) || 0)) / 100
    : Number(discount.value) || 0;
  const taxAmt        = ((subtotal - discountAmt) * (Number(tax.percent) || 0)) / 100;
  const total         = subtotal - discountAmt + taxAmt;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.associate) return toast.error("Select an associate");
    if (!form.clientId) return toast.error("Select a client");
    if (!selectedLeadIds.length) return toast.error("Select one or more leads");
    if (!form.customerName) return toast.error("Customer name is required");
    if (!serviceLines.length) return toast.error("No services found for this client");

    setLoading(true);
    try {
      const res = await axiosInstance.post("/quotations", {
        associate: form.associate,
        clientId: form.clientId,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        discount,
        tax,
        notes: form.notes,
        terms: form.terms,
        validUntil: form.validUntil,
        leadIds: selectedLeadIds,
      });
      toast.success("Quotation created");
      navigate(`/admin/quotations/${res.data.quotation._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <form onSubmit={submit} className="p-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Quotation</h1>
          <p className="text-sm text-gray-500">Select an associate and client, then pick the leads to include.</p>
        </div>

        {/* ── Associate + Client + Leads ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Associate *</label>
            <select className="w-full rounded-lg border p-3" value={form.associate}
              onChange={(e) => setForm({ ...form, associate: e.target.value })} required>
              <option value="">Select associate</option>
              {associates.map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Client *</label>
            <select className="w-full rounded-lg border p-3" value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              required disabled={!form.associate || loadingClients}>
              <option value="">{loadingClients ? "Loading…" : "Select client"}</option>
              {clients.map((c) => (
                <option key={c.clientKey} value={c.clientId || c.clientKey}>
                  {c.clientName}{c.mobileNumber ? ` (${c.mobileNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Leads checklist */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Select Leads</label>
            <div className="rounded-lg border bg-white p-3 min-h-[100px]">
              {loadingLeads ? (
                <p className="text-sm text-gray-500">Loading leads…</p>
              ) : leads.length ? (
                <div className="space-y-2">
                  {leads.map((lead) => {
                    const isMulti = Array.isArray(lead.services) && lead.services.length > 0;
                    const svcCount = isMulti ? lead.services.length : 1;
                    const svcNames = isMulti
                      ? lead.services.map((s) => s.name).join(", ")
                      : lead.service?.name || "No service";
                    return (
                      <label key={lead._id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="mt-0.5"
                          checked={selectedLeadIds.includes(lead._id)}
                          onChange={(e) => {
                            setSelectedLeadIds(e.target.checked
                              ? [...selectedLeadIds, lead._id]
                              : selectedLeadIds.filter((id) => id !== lead._id));
                          }} />
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {lead.leadId} — {lead.clientDetails?.clientName}
                            {isMulti && <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">{svcCount} services</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{svcNames}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No leads found for this client.</p>
              )}
            </div>
          </div>

          {/* Customer fields */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Valid Until</label>
            <input type="date" className="w-full rounded-lg border p-3" value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Name *</label>
            <input className="w-full rounded-lg border p-3" value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Email</label>
            <input type="email" className="w-full rounded-lg border p-3" value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Phone</label>
            <input className="w-full rounded-lg border p-3" value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          </div>
        </section>

        {/* ── Service lines preview ── */}
        {serviceLines.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Services Preview</h2>
                <p className="text-sm text-gray-500">Each service from the selected leads — individual amounts and commissions.</p>
              </div>
              <span className="text-sm text-gray-600 font-medium">{serviceLines.length} service(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                  <tr>
                    <th className="p-3">Lead</th>
                    <th className="p-3">Service</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right text-green-700">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceLines.map((line, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 text-gray-500 text-xs">{line.leadRef}</td>
                      <td className="p-3 font-medium text-gray-900">{line.name}</td>
                      <td className="p-3 text-right text-gray-700">{formatMoney(line.price)}</td>
                      <td className="p-3 text-right text-gray-700">{line.quantity}</td>
                      <td className="p-3 text-right text-gray-900 font-medium">{formatMoney(line.amount)}</td>
                      <td className="p-3 text-right text-green-700 font-medium">
                        {line.associateEarningAmount > 0
                          ? formatMoney(line.associateEarningAmount)
                          : line.associateEarningPercent > 0
                          ? `${line.associateEarningPercent}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td className="p-3 text-gray-700" colSpan={4}>Total</td>
                    <td className="p-3 text-right text-gray-900">{formatMoney(subtotal)}</td>
                    <td className="p-3 text-right text-green-700">{formatMoney(totalCommission)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* ── Discount / Tax / Notes ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select className="w-full border rounded-lg p-3" value={discount.type}
              onChange={(e) => setDiscount({ ...discount, type: e.target.value })}>
              <option value="flat">Flat (Rs.)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
            <input type="number" min="0" className="w-full border rounded-lg p-3" value={discount.value}
              onChange={(e) => setDiscount({ ...discount, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
            <input type="number" min="0" max="100" className="w-full border rounded-lg p-3" value={tax.percent}
              onChange={(e) => setTax({ percent: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded-lg p-3" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            <textarea className="w-full border rounded-lg p-3" rows={2} value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
        </section>

        {/* ── Grand total summary ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex justify-end">
            <div className="w-80 space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(subtotal)} />
              {discountAmt > 0 && <Row label={`Discount${discount.type === "percentage" ? ` (${discount.value}%)` : ""}`} value={`- ${formatMoney(discountAmt)}`} />}
              {taxAmt > 0 && <Row label={`Tax (${tax.percent}%)`} value={formatMoney(taxAmt)} />}
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
              {totalCommission > 0 && (
                <div className="border-t pt-2 flex justify-between text-sm font-semibold text-green-700">
                  <span>Total Commission</span>
                  <span>{formatMoney(totalCommission)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-lg bg-gray-900 px-6 py-3 text-white disabled:opacity-50">
            {loading ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </form>
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
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default CreateQuotation;