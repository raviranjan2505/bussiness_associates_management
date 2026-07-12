import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import AddAttachmentsInput from "../../components/AddAttachmentsInput";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00";

// Creates a fresh empty service card state
const newServiceCard = () => ({
  id: Date.now() + Math.random(),
  division: "",
  service: "",
  services: [],          // fetched services for the selected division
  selectedService: null, // full service doc
  formData: {},
  documents: [],
  loanAmount: "",
});

// ─── Single Service Card ────────────────────────────────────────────────────
const ServiceCard = ({
  card,
  index,
  divisions,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  const isLoanBased = card.selectedService?.commissionType === "Loan Based";
  const servicePrice = Number(card.selectedService?.price || 0);
  const loanAmount = Number(card.loanAmount || 0);
  const commissionPercent = Number(
    card.selectedService?.commissionValue ?? card.selectedService?.associateEarningPercent ?? 20
  );
  const associateEarning = isLoanBased
    ? (loanAmount * commissionPercent) / 100
    : Number(card.selectedService?.associateEarningAmount ?? servicePrice * 0.2);

  const handleDivisionChange = (divisionId) => {
    onUpdate(card.id, {
      division: divisionId,
      service: "",
      services: [],
      selectedService: null,
      formData: {},
    });
    if (!divisionId) return;
    axiosInstance
      .get("/business/services", { params: { division: divisionId } })
      .then((res) => onUpdate(card.id, { services: res.data.services || [] }))
      .catch(console.error);
  };

  const handleServiceChange = (serviceId) => {
    onUpdate(card.id, { service: serviceId, selectedService: null, formData: {} });
    if (!serviceId) return;
    axiosInstance
      .get(`/business/services/${serviceId}`)
      .then((res) => onUpdate(card.id, { selectedService: res.data }))
      .catch(console.error);
  };

  const renderField = (field) => {
    const common = {
      className: "w-full rounded-lg border p-3",
      required: field.required,
      placeholder: field.placeholder || field.label,
      value: card.formData[field.name] || "",
      onChange: (e) =>
        onUpdate(card.id, {
          formData: { ...card.formData, [field.name]: e.target.value },
        }),
    };
    if (field.type === "textarea") return <textarea {...common} />;
    return <input type={field.type === "tel" ? "tel" : field.type} {...common} />;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 px-5 py-3">
        <h3 className="font-semibold text-gray-800">Service {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(card.id)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {/* Division & Service selects */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Division <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border p-3"
              value={card.division}
              onChange={(e) => handleDivisionChange(e.target.value)}
              required
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Service <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border p-3"
              value={card.service}
              onChange={(e) => handleServiceChange(e.target.value)}
              required
              disabled={!card.division}
            >
              <option value="">Select service</option>
              {card.services.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing */}
        {card.selectedService && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isLoanBased ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Loan Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border p-3"
                    placeholder="Enter loan amount"
                    value={card.loanAmount}
                    onChange={(e) => onUpdate(card.id, { loanAmount: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">Service Price</p>
                  <input
                    className="w-full rounded-lg border bg-gray-50 p-3 text-gray-600"
                    value={`Rs. ${formatMoney(servicePrice)}`}
                    disabled
                  />
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {isLoanBased ? `Commission (${commissionPercent}% of Loan Amount)` : `Associate Earning (${commissionPercent}%)`}
                </p>
                <input
                  className="w-full rounded-lg border bg-gray-50 p-3 text-gray-600"
                  value={`Rs. ${formatMoney(associateEarning)}`}
                  disabled
                />
              </div>
            </div>

            {/* Dynamic form fields */}
            {card.selectedService.fields?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  {card.selectedService.name} — Form Fields
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {card.selectedService.fields.map((field) => (
                    <div key={field._id}>{renderField(field)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Documents</p>
              {card.selectedService.requiredDocuments?.length > 0 && (
                <p className="mb-3 text-xs text-gray-500">
                  Expected:{" "}
                  {card.selectedService.requiredDocuments.map((d) => d.name).join(", ")}
                </p>
              )}
              <AddAttachmentsInput
                attachments={card.documents}
                setAttachments={(docs) => onUpdate(card.id, { documents: docs })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
const SubmitWork = () => {
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientRef, setClientRef] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [serviceCards, setServiceCards] = useState([newServiceCard()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosInstance
      .get("/business/divisions")
      .then((res) => setDivisions(res.data.divisions || []))
      .catch(console.error);
    axiosInstance
      .get("/business/clients")
      .then((res) => setClients(res.data.clients || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!clientRef) return setSelectedClient(null);
    const client =
      clients.find((c) => String(c.clientId || c.clientKey) === clientRef) || null;
    setSelectedClient(client);
  }, [clientRef, clients]);

  // Update a single card by id — merges partial state
  const updateCard = useCallback((id, patch) => {
    setServiceCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, ...patch } : card))
    );
  }, []);

  const addCard = () => setServiceCards((prev) => [...prev, newServiceCard()]);

  const removeCard = (id) =>
    setServiceCards((prev) => prev.filter((c) => c.id !== id));

  const submit = async (e) => {
    e.preventDefault();

    if (!clientRef || !selectedClient) {
      toast.error("Select a client first");
      return;
    }

    // Validate every card has division + service
    for (let i = 0; i < serviceCards.length; i++) {
      const card = serviceCards[i];
      if (!card.division || !card.service) {
        toast.error(`Service ${i + 1}: Please select both a division and a service`);
        return;
      }
      if (card.selectedService?.commissionType === "Loan Based" && !(Number(card.loanAmount) > 0)) {
        toast.error(`Service ${i + 1}: Please enter a valid Loan Amount`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = new FormData();

      // Client info
      if (selectedClient.clientId) {
        payload.append("clientId", String(selectedClient.clientId));
      } else {
        payload.append(
          "clientDetails",
          JSON.stringify({
            clientName: selectedClient.clientName,
            mobileNumber: selectedClient.mobileNumber,
            email: selectedClient.email,
            address: selectedClient.address,
          })
        );
      }

      // Services metadata (JSON array)
      const servicesMeta = serviceCards.map((card) => ({
        division: card.division,
        service: card.service,
        formData: card.formData,
        loanAmount: card.selectedService?.commissionType === "Loan Based" ? Number(card.loanAmount || 0) : undefined,
      }));
      payload.append("services", JSON.stringify(servicesMeta));

      // Files — keyed by card index so backend can map them
      serviceCards.forEach((card, idx) => {
        card.documents.forEach((file) => {
          payload.append(`documents_${idx}`, file);
        });
      });

      const res = await axiosInstance.post("/business/works/multi", payload);
      toast.success("Work submitted successfully");

      // Navigate to the single created lead
      const work = res.data.work || res.data.works?.[0];
      if (work) navigate(`/associate/leads/${work._id}`);
      else navigate("/associate/leads");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to submit work");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Submit Work">
      <form onSubmit={submit} className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Submit Work</h1>
            <p className="text-sm text-gray-500">
              Pick a client, then add one or more services for a single submission.
            </p>
          </div>
          <Link
            to="/associate/clients"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Add or manage clients
          </Link>
        </div>

        {/* ── Client selection ── */}
        <section className="rounded-lg border border-gray-100 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Client Information</h2>
          <select
            className="w-full rounded-lg border p-3 md:max-w-sm"
            value={clientRef}
            onChange={(e) => setClientRef(e.target.value)}
            required
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.clientKey} value={client.clientId || client.clientKey}>
                {client.clientName}
                {client.mobileNumber ? ` (${client.mobileNumber})` : ""}
              </option>
            ))}
          </select>

          {selectedClient && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="Client Name" value={selectedClient.clientName} />
              <Info label="Mobile" value={selectedClient.mobileNumber} />
              <Info label="Email" value={selectedClient.email} />
              <Info label="Address" value={selectedClient.address} />
            </div>
          )}
        </section>

        {/* ── Service cards ── */}
        <div className="space-y-4">
          {serviceCards.map((card, index) => (
            <ServiceCard
              key={card.id}
              card={card}
              index={index}
              divisions={divisions}
              onUpdate={updateCard}
              onRemove={removeCard}
              canRemove={serviceCards.length > 1}
            />
          ))}
        </div>

        {/* Add service button */}
        <button
          type="button"
          onClick={addCard}
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors w-full justify-center"
        >
          <Plus size={16} />
          Add Service
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-60 transition-colors"
        >
          {submitting
            ? "Submitting…"
            : `Submit Work Request${serviceCards.length > 1 ? ` (${serviceCards.length} Services)` : ""}`}
        </button>
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