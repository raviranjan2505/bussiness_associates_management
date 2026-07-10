import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const createBlankField = () => ({ label: "", name: "", type: "text", required: false, options: [] });
const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const ManageDivisionsServices = () => {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [divisionForm, setDivisionForm] = useState({ name: "", description: "", isActive: true });
  const [editingDivisionId, setEditingDivisionId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    division: "",
    price: "",
    commissionType: "Percentage",
    commissionValue: "20",
    fields: [createBlankField()],
    requiredDocuments: [],
    isActive: true,
  });
  const [editingServiceId, setEditingServiceId] = useState(null);

  const isLoanBased = serviceForm.commissionType === "Loan Based";

  // Live preview of the commission for normal (non Loan Based) services
  const commissionPreview = (() => {
    const price = Number(serviceForm.price || 0);
    const value = Number(serviceForm.commissionValue || 0);
    if (serviceForm.commissionType === "Fixed Amount") return value;
    if (serviceForm.commissionType === "Percentage") return (price * value) / 100;
    return 0;
  })();

  // Divisions table (top of the Division Management card)
  const {
    page: divisionTablePage,
    totalPages: divisionTableTotalPages,
    paged: pagedDivisionsTable,
    resetPage: resetDivisionTablePage,
    onPrev: onDivisionTablePrev,
    onNext: onDivisionTableNext,
  } = usePagination(divisions, 10);

  // "All Divisions & Services" section — paginated by division, each division
  // still shows its full services table underneath.
  const {
    page: groupedPage,
    totalPages: groupedTotalPages,
    paged: pagedGroupedDivisions,
    resetPage: resetGroupedPage,
    onPrev: onGroupedPrev,
    onNext: onGroupedNext,
  } = usePagination(divisions, 5);

  const load = async () => {
    const [divRes, serviceRes] = await Promise.all([
      axiosInstance.get("/business/divisions"),
      axiosInstance.get("/business/services"),
    ]);
    setDivisions(divRes.data.divisions || []);
    setServices(serviceRes.data.services || []);
    resetDivisionTablePage();
    resetGroupedPage();
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const saveDivision = async (e) => {
    e.preventDefault();
    try {
      if (editingDivisionId) {
        await axiosInstance.put(`/business/divisions/${editingDivisionId}`, divisionForm);
        toast.success("Division updated");
      } else {
        await axiosInstance.post("/business/divisions", divisionForm);
        toast.success("Division created");
      }
      setDivisionForm({ name: "", description: "", isActive: true });
      setEditingDivisionId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save division");
    }
  };

  const startEditDivision = (division) => {
    setEditingDivisionId(division._id);
    setDivisionForm({
      name: division.name || "",
      description: division.description || "",
      isActive: division.isActive !== false,
    });
  };

  const cancelEditDivision = () => {
    setEditingDivisionId(null);
    setDivisionForm({ name: "", description: "", isActive: true });
  };

  const deleteDivisionHandler = async (division) => {
    if (!window.confirm(`Delete division "${division.name}"? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/business/divisions/${division._id}`);
      toast.success("Division deleted");
      if (editingDivisionId === division._id) cancelEditDivision();
      load();
    } catch (err) {
      // e.g. backend blocks deletion while services still exist under this division
      toast.error(err.response?.data?.message || "Unable to delete division");
    }
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
    try {
      if (editingServiceId) {
        await axiosInstance.put(`/business/services/${editingServiceId}`, payload);
        toast.success("Service updated");
      } else {
        await axiosInstance.post("/business/services", payload);
        toast.success("Service configured");
      }
      setServiceForm({
        name: "",
        description: "",
        division: "",
        price: "",
        commissionType: "Percentage",
        commissionValue: "20",
        fields: [createBlankField()],
        requiredDocuments: [],
        isActive: true,
      });
      setEditingServiceId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save service");
    }
  };

  const startEditService = (service) => {
    setEditingServiceId(service._id);
    setServiceForm({
      name: service.name || "",
      description: service.description || "",
      division: service.division?._id || service.division || "",
      price: service.commissionType === "Loan Based" ? "" : String(service.price ?? ""),
      commissionType: service.commissionType || "Percentage",
      commissionValue: String(service.commissionValue ?? 20),
      fields: service.fields?.length
        ? service.fields.map((f) => ({
            label: f.label || "",
            name: f.name || "",
            type: f.type || "text",
            required: !!f.required,
            options: f.options || [],
          }))
        : [createBlankField()],
      requiredDocuments: (service.requiredDocuments || []).map((d) => ({ name: d.name, required: d.required !== false })),
      isActive: service.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setServiceForm({
      name: "",
      description: "",
      division: "",
      price: "",
      commissionType: "Percentage",
      commissionValue: "20",
      fields: [createBlankField()],
      requiredDocuments: [],
      isActive: true,
    });
  };

  const deleteServiceHandler = async (service) => {
    if (!window.confirm(`Delete service "${service.name}"? This cannot be undone.`)) return;
    try {
      const res = await axiosInstance.delete(`/business/services/${service._id}`);
      // Backend soft-disables (isActive: false) instead of deleting when the
      // service already has work submissions against it.
      toast.success(res.data?.message || "Service deleted");
      if (editingServiceId === service._id) cancelEditService();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete service");
    }
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
          <h1 className="text-xl font-bold text-gray-900">
            {editingDivisionId ? "Edit Division" : "Division Management"}
          </h1>
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={divisionForm.isActive}
                onChange={(e) => setDivisionForm({ ...divisionForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <div className="flex items-center gap-3">
              <button className="bg-gray-900 text-white rounded-lg px-4 py-2">
                {editingDivisionId ? "Update Division" : "Create Division"}
              </button>
              {editingDivisionId && (
                <button type="button" onClick={cancelEditDivision} className="text-sm text-gray-500 hover:text-gray-800">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* All divisions — editable/deletable table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {divisions.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No divisions yet.</td></tr>
                ) : (
                  pagedDivisionsTable.map((division) => (
                    <tr key={division._id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{division.name}</td>
                      <td className="px-3 py-2 text-gray-500">{division.description || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          division.isActive !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {division.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => startEditDivision(division)} className="text-xs font-medium text-blue-700 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => deleteDivisionHandler(division)} className="text-xs font-medium text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={divisionTablePage}
            totalPages={divisionTableTotalPages}
            onPrev={onDivisionTablePrev}
            onNext={onDivisionTableNext}
            totalItems={divisions.length}
            pageSize={10}
          />
        </section>

        <section className="bg-white border border-gray-100 rounded-lg p-5">
          <h1 className="text-xl font-bold text-gray-900">
            {editingServiceId ? "Edit Service" : "Service Form Builder"}
          </h1>
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
              value={serviceForm.requiredDocuments.map((d) => d.name).join(", ")}
              onChange={(e) =>
                setServiceForm({
                  ...serviceForm,
                  requiredDocuments: e.target.value.split(",").map((name) => ({ name: name.trim(), required: true })),
                })
              }
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={serviceForm.isActive}
                onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
              />
              Active
            </label>
            <div className="flex items-center gap-3">
              <button className="bg-gray-900 text-white rounded-lg px-4 py-2">
                {editingServiceId ? "Update Service" : "Save Service"}
              </button>
              {editingServiceId && (
                <button type="button" onClick={cancelEditService} className="text-sm text-gray-500 hover:text-gray-800">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="xl:col-span-2 bg-white border border-gray-100 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900">All Divisions &amp; Services</h2>
          <p className="text-sm text-gray-500 mt-1">Every division with its configured services, editable or removable below.</p>

          <div className="mt-4 space-y-6">
            {divisions.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No divisions yet — create one to get started.</p>
            ) : (
              pagedGroupedDivisions.map((division) => {
                const divisionServices = services.filter(
                  (s) => (s.division?._id || s.division) === division._id
                );
                return (
                  <div key={division._id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{division.name}</p>
                        {division.description && (
                          <p className="text-xs text-gray-500">{division.description}</p>
                        )}
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        division.isActive !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {division.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-2">Service</th>
                            <th className="px-4 py-2">Commission Type</th>
                            <th className="px-4 py-2">Price</th>
                            <th className="px-4 py-2">Commission</th>
                            <th className="px-4 py-2">Associate Earning</th>
                            <th className="px-4 py-2">Fields / Docs</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divisionServices.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-4 text-center text-gray-400">No services under this division yet.</td></tr>
                          ) : (
                            divisionServices.map((service) => (
                              <tr key={service._id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-gray-900">{service.name}</td>
                                <td className="px-4 py-2">
                                  <span className="inline-block text-[11px] font-medium uppercase tracking-wide text-blue-700 bg-blue-50 rounded px-2 py-0.5">
                                    {service.commissionType || "Percentage"}
                                  </span>
                                </td>
                                {service.commissionType === "Loan Based" ? (
                                  <>
                                    <td className="px-4 py-2 text-gray-500">Rs. 0.00</td>
                                    <td className="px-4 py-2 text-gray-500">{Number(service.commissionValue ?? 0)}% of Loan Amount</td>
                                    <td className="px-4 py-2 text-gray-500">—</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-2 text-gray-500">Rs. {formatMoney(service.price)}</td>
                                    <td className="px-4 py-2 text-gray-500">
                                      {service.commissionType === "Fixed Amount"
                                        ? `Rs. ${formatMoney(service.commissionValue ?? service.associateEarningAmount ?? 0)} (Fixed)`
                                        : `${Number(service.commissionValue ?? service.associateEarningPercent ?? 20)}%`}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500">
                                      Rs. {formatMoney(service.associateEarningAmount ?? Number(service.price || 0) * 0.2)}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-2 text-gray-500">
                                  {service.fields?.length || 0} / {service.requiredDocuments?.length || 0}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    service.isActive !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                  }`}>
                                    {service.isActive !== false ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                                  <button onClick={() => startEditService(service)} className="text-xs font-medium text-blue-700 hover:underline">
                                    Edit
                                  </button>
                                  <button onClick={() => deleteServiceHandler(service)} className="text-xs font-medium text-red-600 hover:underline">
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Pagination
            page={groupedPage}
            totalPages={groupedTotalPages}
            onPrev={onGroupedPrev}
            onNext={onGroupedNext}
            totalItems={divisions.length}
            pageSize={5}
          />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageDivisionsServices;