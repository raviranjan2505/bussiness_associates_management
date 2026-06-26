import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AddAttachmentsInput from "../../components/AddAttachmentsInput";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const emptyForm = { division: "", service: "", clientRef: "" };

const SubmitWork = () => {
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState([]);

  const servicePrice = Number(selectedService?.price || 0);
  const associateEarning = Number(selectedService?.associateEarningAmount ?? servicePrice * 0.2);

  useEffect(() => {
    axiosInstance.get("/business/divisions").then((res) => setDivisions(res.data.divisions || [])).catch(console.error);
    axiosInstance.get("/business/clients").then((res) => setClients(res.data.clients || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.division) return;
    axiosInstance.get("/business/services", { params: { division: form.division } }).then((res) => setServices(res.data.services || [])).catch(console.error);
  }, [form.division]);

  useEffect(() => {
    if (!form.service) return setSelectedService(null);
    axiosInstance.get(`/business/services/${form.service}`).then((res) => setSelectedService(res.data)).catch(console.error);
  }, [form.service]);

  useEffect(() => {
    if (!form.clientRef) return setSelectedClient(null);
    const client = clients.find((item) => String(item.clientId || item.clientKey) === form.clientRef) || null;
    setSelectedClient(client);
  }, [form.clientRef, clients]);

  const selectedClientPayload = useMemo(() => {
    if (!selectedClient) return null;
    return {
      clientName: selectedClient.clientName,
      mobileNumber: selectedClient.mobileNumber,
      email: selectedClient.email,
      address: selectedClient.address,
    };
  }, [selectedClient]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.clientRef || !selectedClient) {
      toast.error("Select a client first");
      return;
    }

    const payload = new FormData();
    payload.append("division", form.division);
    payload.append("service", form.service);
    if (selectedClient.clientId) {
      payload.append("clientId", String(selectedClient.clientId));
    } else {
      payload.append("clientDetails", JSON.stringify(selectedClientPayload));
    }
    payload.append("formData", JSON.stringify(formData));
    documents.forEach((file) => payload.append("documents", file));

    try {
      const res = await axiosInstance.post("/business/works", payload);
      toast.success("Work submitted");
      navigate(`/associate/work/${res.data.work._id}`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to submit work");
    }
  };

  const renderField = (field) => {
    const common = {
      className: "w-full rounded-lg border p-3",
      required: field.required,
      placeholder: field.placeholder || field.label,
      value: formData[field.name] || "",
      onChange: (e) => setFormData({ ...formData, [field.name]: e.target.value }),
    };
    if (field.type === "textarea") return <textarea {...common} />;
    return <input type={field.type === "tel" ? "tel" : field.type} {...common} />;
  };

  return (
    <DashboardLayout activeMenu="Submit Work">
      <form onSubmit={submit} className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Work</h1>
            <p className="text-sm text-gray-500">
              Pick a saved client, then the client details will go with the work automatically.
            </p>
          </div>
          <Link to="/associate/clients" className="text-sm font-medium text-blue-700 hover:underline">
            Add or manage clients
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 rounded-lg border border-gray-100 bg-white p-5 md:grid-cols-3">
          <select
            className="rounded-lg border p-3"
            value={form.division}
            onChange={(e) => setForm({ ...form, division: e.target.value, service: "", clientRef: form.clientRef })}
            required
          >
            <option value="">Select division</option>
            {divisions.map((division) => (
              <option key={division._id} value={division._id}>
                {division.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border p-3"
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
            required
            disabled={!form.division}
          >
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service._id} value={service._id}>
                {service.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border p-3"
            value={form.clientRef}
            onChange={(e) => setForm({ ...form, clientRef: e.target.value })}
            required
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.clientKey} value={client.clientId || client.clientKey}>
                {client.clientName} {client.mobileNumber ? `(${client.mobileNumber})` : ""}
              </option>
            ))}
          </select>
        </section>

        {selectedClient && (
          <section className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Selected Client</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="Client Name" value={selectedClient.clientName} />
              <Info label="Mobile" value={selectedClient.mobileNumber} />
              <Info label="Email" value={selectedClient.email} />
              <Info label="Address" value={selectedClient.address} />
            </div>
          </section>
        )}

        {selectedService && (
          <>
            <section className="rounded-lg border border-gray-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-900">Service Pricing</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Service Price</p>
                  <input className="w-full rounded-lg border bg-gray-50 p-3 text-gray-600" value={`Rs. ${formatMoney(servicePrice)}`} disabled />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Associate Earning (20%)</p>
                  <input className="w-full rounded-lg border bg-gray-50 p-3 text-gray-600" value={`Rs. ${formatMoney(associateEarning)}`} disabled />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-900">{selectedService.name} Form</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {selectedService.fields?.map((field) => (
                  <div key={field._id}>{renderField(field)}</div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-100 bg-white p-5">
              <h2 className="mb-2 font-semibold text-gray-900">Documents</h2>
              {selectedService.requiredDocuments?.length > 0 && (
                <p className="mb-4 text-sm text-gray-500">
                  Expected: {selectedService.requiredDocuments.map((d) => d.name).join(", ")}
                </p>
              )}
              <AddAttachmentsInput attachments={documents} setAttachments={setDocuments} />
            </section>

            <button className="rounded-lg bg-gray-900 px-5 py-3 text-white">Submit Work Request</button>
          </>
        )}
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

export default SubmitWork;
