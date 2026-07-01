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
    fields: [createBlankField()],
    requiredDocuments: [],
  });

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
    const payload = {
      ...serviceForm,
      price: serviceForm.price === "" ? "" : Number(serviceForm.price),
      fields: serviceForm.fields.filter((f) => f.label && f.name).map((f, i) => ({ ...f, order: i })),
      requiredDocuments: serviceForm.requiredDocuments.filter((d) => d.name),
    };
    await axiosInstance.post("/business/services", payload);
    setServiceForm({
      name: "",
      description: "",
      division: "",
      price: "",
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <input
                className="w-full border rounded-lg p-3 bg-gray-50 text-gray-600"
                placeholder="Associate earning (20%)"
                value={formatMoney(Number(serviceForm.price || 0) * 0.2)}
                disabled
              />
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
                <p className="text-xs text-gray-500 mt-2">Price: Rs. {formatMoney(service.price)}</p>
                <p className="text-xs text-gray-500">
                  Associate earning: Rs. {formatMoney(service.associateEarningAmount ?? Number(service.price || 0) * 0.2)}
                </p>
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
