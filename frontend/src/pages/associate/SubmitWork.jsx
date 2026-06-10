import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AddAttachmentsInput from "../../components/AddAttachmentsInput";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const SubmitWork = () => {
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({ division: "", service: "", clientName: "", mobileNumber: "", email: "", address: "" });
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState([]);
  const servicePrice = Number(selectedService?.price || 0);
  const associateEarning = Number(selectedService?.associateEarningAmount ?? servicePrice * 0.2);

  useEffect(() => {
    axiosInstance.get("/business/divisions").then((res) => setDivisions(res.data.divisions || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.division) return;
    axiosInstance.get("/business/services", { params: { division: form.division } }).then((res) => setServices(res.data.services || [])).catch(console.error);
  }, [form.division]);

  useEffect(() => {
    if (!form.service) return setSelectedService(null);
    axiosInstance.get(`/business/services/${form.service}`).then((res) => setSelectedService(res.data)).catch(console.error);
  }, [form.service]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("division", form.division);
    payload.append("service", form.service);
    payload.append("clientDetails", JSON.stringify({
      clientName: form.clientName,
      mobileNumber: form.mobileNumber,
      email: form.email,
      address: form.address,
    }));
    payload.append("formData", JSON.stringify(formData));
    documents.forEach((file) => payload.append("documents", file));
    const res = await axiosInstance.post("/business/works", payload);
    toast.success("Work submitted");
    navigate(`/associate/work/${res.data.work._id}`);
  };

  const renderField = (field) => {
    const common = {
      className: "w-full border rounded-lg p-3",
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Work</h1>
          <p className="text-sm text-gray-500">Select a division and service to open the configured form.</p>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <select className="border rounded-lg p-3" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value, service: "" })} required>
            <option value="">Select division</option>
            {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
          </select>
          <select className="border rounded-lg p-3" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required disabled={!form.division}>
            <option value="">Select service</option>
            {services.map((service) => <option key={service._id} value={service._id}>{service.name}</option>)}
          </select>
        </section>

        {selectedService && (
          <>
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Service Pricing</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Service Price</p>
                  <input className="border rounded-lg p-3 bg-gray-50 text-gray-600 w-full" value={`Rs. ${formatMoney(servicePrice)}`} disabled />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Associate Earning (20%)</p>
                  <input className="border rounded-lg p-3 bg-gray-50 text-gray-600 w-full" value={`Rs. ${formatMoney(associateEarning)}`} disabled />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Client Details</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input className="border rounded-lg p-3" placeholder="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
                <input className="border rounded-lg p-3" placeholder="Mobile Number" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} required />
                <input type="email" className="border rounded-lg p-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <textarea className="border rounded-lg p-3" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{selectedService.name} Form</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {selectedService.fields?.map((field) => <div key={field._id}>{renderField(field)}</div>)}
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Documents</h2>
              {selectedService.requiredDocuments?.length > 0 && <p className="text-sm text-gray-500 mb-4">Expected: {selectedService.requiredDocuments.map((d) => d.name).join(", ")}</p>}
              <AddAttachmentsInput attachments={documents} setAttachments={setDocuments} />
            </section>

            <button className="bg-gray-900 text-white rounded-lg px-5 py-3">Submit Work Request</button>
          </>
        )}
      </form>
    </DashboardLayout>
  );
};

export default SubmitWork;
