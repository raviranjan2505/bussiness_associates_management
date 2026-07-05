import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const createBlankField = () => ({ label: "", name: "", type: "text", required: false, options: [] });
const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const ManageDivisionsServices = () => {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [divisionForm, setDivisionForm] = useState({ name: "", description: "" });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    division: "",
    price: "",
    commissionType: "Percentage",
    commissionValue: "20",
    fields: [createBlankField()],
    requiredDocuments: [],
  });

  const isLoanBased = serviceForm.commissionType === "Loan Based";

  // Live preview of the commission for normal (non Loan Based) services
  const commissionPreview = (() => {
    const price = Number(serviceForm.price || 0);
    const value = Number(serviceForm.commissionValue || 0);
    if (serviceForm.commissionType === "Fixed Amount") return value;
    if (serviceForm.commissionType === "Percentage") return (price * value) / 100;
    return 0;
  })();

  const load = async () => {
    const [divRes, serviceRes] = await Promise.all([
      axiosInstance.get("/business/divisions"),
      axiosInstance.get("/business/services"),
    ]);
    setDivisions(divRes.data.divisions || []);
    setServices(serviceRes.data.services || []);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const saveDivision = async (e) => {
    e.preventDefault();
    await axiosInstance.post("/business/divisions", divisionForm);
    setDivisionForm({ name: "", description: "" });
    toast.success("Division created");
    load();
  };

  const saveService = async (e) => {
    e.preventDefault();
    const loanBased = serviceForm.commissionType === "Loan Based";
    const payload = {
      ...serviceForm,
      // Loan Based services always keep the service charge at ₹0 — the
      // commission comes from the Loan Amount entered when the work is created.
      price: loanBased ? 0 : serviceForm.price === "" ? "" : Number(serviceForm.price),
      commissionValue: Number(serviceForm.commissionValue || 0),
      fields: serviceForm.fields.filter((f) => f.label && f.name).map((f, i) => ({ ...f, order: i })),
      requiredDocuments: serviceForm.requiredDocuments.filter((d) => d.name),
    };
    await axiosInstance.post("/business/services", payload);
    setServiceForm({
      name: "",
      description: "",
      division: "",
      price: "",
      commissionType: "Percentage",
      commissionValue: "20",
      fields: [createBlankField()],
      requiredDocuments: [],
    });
    toast.success("Service configured");
    load();
  };

  const updateField = (index, key, value) => {
    setServiceForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index
          ? {
              ...field,
              [key]: value,
              name: key === "label" ? value.toLowerCase().replace(/\W+/g, "_") : field.name,
            }
          : field
      ),
    }));
  };

  return (
    <DashboardLayout activeMenu="Services">
      <div className="p-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="bg-white border border-gray-100 rounded-lg p-5">
          <h1 className="text-xl font-bold text-gray-900">Division Management</h1>
          <form onSubmit={saveDivision} className="mt-4 space-y-3">
            <input
              className="w-full border rounded-lg p-3"
              placeholder="Division name"
              value={divisionForm.name}
              onChange={(e) => setDivisionForm({ ...divisionForm, name: e.target.value })}
              required
            />
            <textarea
              className="w-full border rounded-lg p-3"
              placeholder="Description"
              value={divisionForm.description}
              onChange={(e) => setDivisionForm({ ...divisionForm, description: e.target.value })}
            />
            <button className="bg-gray-900 text-white rounded-lg px-4 py-2">Create Division</button>
          </form>
          <div className="mt-5 space-y-2">
            {divisions.map((division) => (
              <div key={division._id} className="border rounded-lg p-3">
                <b>{division.name}</b>
                <p className="text-sm text-gray-500">{division.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-lg p-5">
          <h1 className="text-xl font-bold text-gray-900">Service Form Builder</h1>
          <form onSubmit={saveService} className="mt-4 space-y-3">
            <select
              className="w-full border rounded-lg p-3"
              value={serviceForm.division}
              onChange={(e) => setServiceForm({ ...serviceForm, division: e.target.value })}
              required
            >
              <option value="">Select division</option>
              {divisions.map((division) => (
                <option key={division._id} value={division._id}>
                  {division.name}
                </option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg p-3"
              placeholder="Service name"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              required
            />
            {/* Commission configuration ------------------------------------ */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Commission Type</label>
                <select
                  className="w-full border rounded-lg p-3"
                  value={serviceForm.commissionType}
                  onChange={(e) => setServiceForm({ ...serviceForm, commissionType: e.target.value })}
                >
                  <option value="Fixed Amount">Fixed Amount</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Loan Based">Loan Based</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {serviceForm.commissionType === "Fixed Amount"
                    ? "Commission Amount (Rs.)"
                    : serviceForm.commissionType === "Loan Based"
                    ? "Commission on Loan Amount (%)"
                    : "Commission (%)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border rounded-lg p-3"
                  placeholder="Commission value"
                  value={serviceForm.commissionValue}
                  onChange={(e) => setServiceForm({ ...serviceForm, commissionValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {isLoanBased ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Service Charge</label>
                  <input
                    className="w-full border rounded-lg p-3 bg-gray-50 text-gray-600"
                    value="Rs. 0.00 (Loan Based — charge stays ₹0)"
                    disabled
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Service Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border rounded-lg p-3"
                    placeholder="Service price"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    required
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {isLoanBased ? "Commission (calculated per work)" : "Associate Earning"}
                </label>
                <input
                  className="w-full border rounded-lg p-3 bg-gray-50 text-gray-600"
                  value={
                    isLoanBased
                      ? `${Number(serviceForm.commissionValue || 0)}% of Loan Amount`
                      : `Rs. ${formatMoney(commissionPreview)}`
                  }
                  disabled
                />
              </div>
            </div>
            <textarea
              className="w-full border rounded-lg p-3"
              placeholder="Service description"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            />
            <div className="space-y-2">
              {serviceForm.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_140px_90px] gap-2">
                  <input
                    className="border rounded-lg p-2"
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) => updateField(index, "label", e.target.value)}
                  />
                  <select
                    className="border rounded-lg p-2"
                    value={field.type}
                    onChange={(e) => updateField(index, "type", e.target.value)}
                  >
                    {["text", "email", "tel", "number", "textarea", "date"].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, "required", e.target.checked)} />
                    Required
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-blue-700"
                onClick={() => setServiceForm((p) => ({ ...p, fields: [...p.fields, createBlankField()] }))}
              >
                + Add field
              </button>
            </div>
            <input
              className="w-full border rounded-lg p-3"
              placeholder="Required documents, comma separated"
              onChange={(e) =>
                setServiceForm({
                  ...serviceForm,
                  requiredDocuments: e.target.value.split(",").map((name) => ({ name: name.trim(), required: true })),
                })
              }
            />
            <button className="bg-gray-900 text-white rounded-lg px-4 py-2">Save Service</button>
          </form>
        </section>

        <section className="xl:col-span-2 bg-white border border-gray-100 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900">Configured Services</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service._id} className="border rounded-lg p-4">
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-gray-500">{service.division?.name}</p>
                <span className="inline-block mt-2 text-[11px] font-medium uppercase tracking-wide text-blue-700 bg-blue-50 rounded px-2 py-0.5">
                  {service.commissionType || "Percentage"}
                </span>
                {service.commissionType === "Loan Based" ? (
                  <>
                    <p className="text-xs text-gray-500 mt-2">Service Charge: Rs. 0.00</p>
                    <p className="text-xs text-gray-500">
                      Commission: {Number(service.commissionValue ?? 0)}% of Loan Amount
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mt-2">Price: Rs. {formatMoney(service.price)}</p>
                    <p className="text-xs text-gray-500">
                      Commission: {service.commissionType === "Fixed Amount"
                        ? `Rs. ${formatMoney(service.commissionValue ?? service.associateEarningAmount ?? 0)} (Fixed)`
                        : `${Number(service.commissionValue ?? service.associateEarningPercent ?? 20)}%`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Associate earning: Rs. {formatMoney(service.associateEarningAmount ?? Number(service.price || 0) * 0.2)}
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {service.fields?.length || 0} fields, {service.requiredDocuments?.length || 0} documents
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageDivisionsServices;