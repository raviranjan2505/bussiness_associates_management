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
      setClients([]);
      setLeads([]);
      setSelectedLeadIds([]);
      setSelectedClient(null);
      setForm((prev) => ({ ...prev, clientId: "", customerName: "", customerEmail: "", customerPhone: "" }));
      return;
    }

    setLoadingClients(true);
    axiosInstance
      .get("/business/clients", { params: { associate: form.associate } })
      .then((r) => setClients(r.data.clients || []))
      .catch(console.error)
      .finally(() => setLoadingClients(false));

    setLeads([]);
    setSelectedLeadIds([]);
    setSelectedClient(null);
    setForm((prev) => ({ ...prev, clientId: "", customerName: "", customerEmail: "", customerPhone: "" }));
  }, [form.associate]);

  useEffect(() => {
    if (!form.clientId) {
      setSelectedClient(null);
      setLeads([]);
      setSelectedLeadIds([]);
      setForm((prev) => ({ ...prev, customerName: "", customerEmail: "", customerPhone: "" }));
      return;
    }

    const client = clients.find((item) => String(item.clientId || item.clientKey) === String(form.clientId)) || null;
    setSelectedClient(client);
    if (!client) return;

    setForm((prev) => ({
      ...prev,
      customerName: client.clientName || "",
      customerEmail: client.email || "",
      customerPhone: client.mobileNumber || "",
    }));

    setSelectedLeadIds([]);
    setLoadingLeads(true);
    axiosInstance
      .get("/leads", { params: { associate: form.associate, clientId: form.clientId } })
      .then((r) => setLeads(r.data.leads || []))
      .catch(console.error)
      .finally(() => setLoadingLeads(false));
  }, [form.clientId, clients, form.associate]);

  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedLeadIds.includes(lead._id)),
    [leads, selectedLeadIds]
  );

  const serviceLines = useMemo(() => {
    return selectedLeads.map((lead) => {
      const servicePrice = Number(lead.servicePrice ?? lead.service?.price ?? 0);
      return {
        service: lead.service?._id,
        name: lead.service?.name || `Lead ${lead.leadId}`,
        description: `Lead ${lead.leadId}`,
        price: servicePrice,
        quantity: 1,
        amount: servicePrice,
      };
    });
  }, [selectedLeads]);

  const subtotal = serviceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const discountAmt = discount.type === "percentage" ? (subtotal * (Number(discount.value) || 0)) / 100 : Number(discount.value) || 0;
  const taxAmt = ((subtotal - discountAmt) * (Number(tax.percent) || 0)) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.associate) return toast.error("Select an associate");
    if (!form.clientId) return toast.error("Select a client");
    if (!selectedLeadIds.length) return toast.error("Select one or more leads to create the quotation");
    if (!form.customerName) return toast.error("Customer name is required");
    if (!serviceLines.length) return toast.error("No services found for this client");

    setLoading(true);
    try {
      const payload = {
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
      };
      const res = await axiosInstance.post("/quotations", payload);
      toast.success("Quotation created");
      navigate(`/admin/quotations/${res.data.quotation._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedClientSummary = useMemo(() => {
    if (!selectedClient) return null;
    return {
      name: selectedClient.clientName,
      mobile: selectedClient.mobileNumber,
      email: selectedClient.email,
      address: selectedClient.address,
      leadCount: leads.length,
    };
  }, [selectedClient, leads]);

  return (
    <DashboardLayout activeMenu="Quotations">
      <form onSubmit={submit} className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Quotation</h1>
          <p className="text-sm text-gray-500">Quotation totals are calculated from the selected leads for the chosen client.</p>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Associate *</label>
            <select className="w-full rounded-lg border p-3" value={form.associate} onChange={(e) => setForm({ ...form, associate: e.target.value })} required>
              <option value="">Select associate</option>
              {associates.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Client *</label>
            <select
              className="w-full rounded-lg border p-3"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              required
              disabled={!form.associate || loadingClients}
            >
              <option value="">{loadingClients ? "Loading clients..." : "Select client"}</option>
              {clients.map((client) => (
                <option key={client.clientKey} value={client.clientId || client.clientKey}>
                  {client.clientName} {client.mobileNumber ? `(${client.mobileNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Select Leads</label>
            <div className="rounded-lg border bg-white p-3 min-h-[120px]">
              {loadingLeads ? (
                <div className="text-sm text-gray-500">Loading leads...</div>
              ) : leads.length ? (
                <>
                  <div className="mb-3 text-sm text-gray-600">{leads.length} lead(s) found for this client. Create the quotation from leads only.</div>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                    <label key={lead._id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead._id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedLeadIds, lead._id]
                            : selectedLeadIds.filter((id) => id !== lead._id);
                          setSelectedLeadIds(next);
                        }}
                      />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{lead.leadId} — {lead.clientDetails?.clientName}</div>
                        <div className="text-xs text-gray-500">{lead.service?.name || "No service"} · {lead.clientDetails?.mobileNumber || "No mobile"}</div>
                      </div>
                    </label>
                  ))}
                </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">No leads found for this associate and client.</div>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Valid Until</label>
            <input type="date" className="w-full rounded-lg border p-3" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Name *</label>
            <input className="w-full rounded-lg border p-3" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Email</label>
            <input type="email" className="w-full rounded-lg border p-3" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer Phone</label>
            <input className="w-full rounded-lg border p-3" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          </div>
        </section>

        {selectedClientSummary && (
          <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Selected Client</h2>
                <p className="text-sm text-gray-500">Client details are filled automatically from the selected associate and client leads.</p>
              </div>
              <div className="text-sm text-gray-600">
                Leads found: <span className="font-semibold text-gray-900">{selectedClientSummary.leadCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="Client Name" value={selectedClientSummary.name} />
              <Info label="Mobile" value={selectedClientSummary.mobile} />
              <Info label="Email" value={selectedClientSummary.email} />
              <Info label="Address" value={selectedClientSummary.address} />
            </div>
          </section>
        )}


        {serviceLines.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Selected Leads Included</h2>
                <p className="text-sm text-gray-500">Each selected lead contributes one service line to the quotation subtotal.</p>
              </div>
              <div className="text-sm text-gray-600">
                Service lines: <span className="font-semibold text-gray-900">{serviceLines.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">Lead</th>
                    <th className="p-3">Service</th>
                    <th className="p-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceLines.map((line, index) => (
                    <tr key={`${line.description || line.name}-${index}`} className="border-t">
                      <td className="p-3 text-gray-700">{line.description || "-"}</td>
                      <td className="p-3 font-medium text-gray-900">{line.name}</td>
                      <td className="p-3 text-right text-gray-700">{formatMoney(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select className="w-full border rounded-lg p-3" value={discount.type} onChange={(e) => setDiscount({ ...discount, type: e.target.value })}>
              <option value="flat">Flat (Rs.)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
            <input type="number" min="0" className="w-full border rounded-lg p-3" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
            <input type="number" min="0" max="100" className="w-full border rounded-lg p-3" value={tax.percent} onChange={(e) => setTax({ percent: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded-lg p-3" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            <textarea className="w-full border rounded-lg p-3" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(subtotal)} />
              <Row label="Discount" value={`- ${formatMoney(discountAmt)}`} />
              <Row label={`Tax (${tax.percent || 0}%)`} value={formatMoney(taxAmt)} />
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-gray-900 px-6 py-3 text-white disabled:opacity-50">
            {loading ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value || "-"}</p>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default CreateQuotation;
