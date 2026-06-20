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
  const [clientWorks, setClientWorks] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);
  const [form, setForm] = useState({
    associate: "",
    clientId: "",
    workId: "",
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
      setSelectedClient(null);
      setSelectedWork(null);
      setClientWorks([]);
      setForm((prev) => ({ ...prev, clientId: "", workId: "", customerName: "", customerEmail: "", customerPhone: "" }));
      return;
    }

    setLoadingClients(true);
    axiosInstance
      .get("/business/clients", { params: { associate: form.associate } })
      .then((r) => setClients(r.data.clients || []))
      .catch(console.error)
      .finally(() => setLoadingClients(false));

    setSelectedClient(null);
    setSelectedWork(null);
    setClientWorks([]);
    setForm((prev) => ({ ...prev, clientId: "", workId: "", customerName: "", customerEmail: "", customerPhone: "" }));
  }, [form.associate]);

  useEffect(() => {
    if (!form.clientId) {
      setSelectedClient(null);
      setSelectedWork(null);
      setClientWorks([]);
      setForm((prev) => ({ ...prev, workId: "", customerName: "", customerEmail: "", customerPhone: "" }));
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

    setLoadingWorks(true);
    axiosInstance
      .get("/business/works", {
        params: {
          associate: form.associate,
          clientName: client.clientName || "",
          mobileNumber: client.mobileNumber || "",
          email: client.email || "",
        },
      })
      .then((r) => {
        const works = r.data.works || [];
        setClientWorks(works);
        const latest = works[0] || null;
        setSelectedWork(latest);
        setForm((prev) => ({ ...prev, workId: latest?._id || "" }));
      })
      .catch(console.error)
      .finally(() => setLoadingWorks(false));
  }, [form.clientId, clients, form.associate]);

  useEffect(() => {
    if (!form.workId) {
      setSelectedWork(null);
      return;
    }
    const work = clientWorks.find((item) => item._id === form.workId) || null;
    setSelectedWork(work);
  }, [form.workId, clientWorks]);

  const serviceLines = useMemo(() => {
    return clientWorks
      .filter((work) => work && (work.service?.name || work.workId))
      .map((work) => {
        const servicePrice = Number(work.servicePrice ?? work.service?.price ?? 0);
        return {
          service: work.service?._id,
          name: work.service?.name || work.workId || "Related work",
          description: work.workId ? `Work ID: ${work.workId}` : undefined,
          price: servicePrice,
          quantity: 1,
          amount: servicePrice,
        };
      });
  }, [clientWorks]);

  const subtotal = serviceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const discountAmt = discount.type === "percentage" ? (subtotal * (Number(discount.value) || 0)) / 100 : Number(discount.value) || 0;
  const taxAmt = ((subtotal - discountAmt) * (Number(tax.percent) || 0)) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.associate) return toast.error("Select an associate");
    if (!form.clientId) return toast.error("Select a client");
    if (!form.workId || !selectedWork) return toast.error("Select a work");
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
        services: serviceLines,
        discount,
        tax,
        notes: form.notes,
        terms: form.terms,
        validUntil: form.validUntil,
      });
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
      worksCount: clientWorks.length,
    };
  }, [selectedClient, clientWorks]);

  return (
    <DashboardLayout activeMenu="Quotations">
      <form onSubmit={submit} className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Quotation</h1>
          <p className="text-sm text-gray-500">Quotation totals are calculated from every work linked to the selected client.</p>
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
              onChange={(e) => setForm({ ...form, clientId: e.target.value, workId: "" })}
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Work *</label>
            <select
              className="w-full rounded-lg border p-3"
              value={form.workId}
              onChange={(e) => setForm({ ...form, workId: e.target.value })}
              required
              disabled={!form.clientId || loadingWorks}
            >
              <option value="">{loadingWorks ? "Loading works..." : "Select work"}</option>
              {clientWorks.map((work) => (
                <option key={work._id} value={work._id}>
                  {work.workId} | {work.service?.name} | Rs. {formatMoney(work.servicePrice || work.service?.price || 0)}
                </option>
              ))}
            </select>
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
                <p className="text-sm text-gray-500">Client details are filled automatically from the selected associate record.</p>
              </div>
              <div className="text-sm text-gray-600">
                Works found: <span className="font-semibold text-gray-900">{selectedClientSummary.worksCount}</span>
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

        {selectedWork && (
          <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Selected Work</h2>
                <p className="text-sm text-gray-500">This work stays selected for context, while the quotation uses all related works for the client.</p>
              </div>
              <div className="text-sm text-gray-600">
                Status: <span className="font-semibold text-gray-900">{selectedWork.status || "-"}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="Work ID" value={selectedWork.workId} />
              <Info label="Service" value={selectedWork.service?.name} />
              <Info label="Price" value={formatMoney(selectedWork.servicePrice || selectedWork.service?.price || 0)} />
              <Info label="Updated" value={selectedWork.updatedAt ? new Date(selectedWork.updatedAt).toLocaleString() : "-"} />
            </div>
          </section>
        )}

        {serviceLines.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Related Works Included</h2>
                <p className="text-sm text-gray-500">Each linked work contributes one service line to the quotation subtotal.</p>
              </div>
              <div className="text-sm text-gray-600">
                Service lines: <span className="font-semibold text-gray-900">{serviceLines.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">Work ID</th>
                    <th className="p-3">Service</th>
                    <th className="p-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceLines.map((line, index) => (
                    <tr key={`${line.description || line.name}-${index}`} className="border-t">
                      <td className="p-3 text-gray-700">{line.description ? line.description.replace("Work ID: ", "") : "-"}</td>
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
