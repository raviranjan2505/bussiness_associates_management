import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";

const ManageQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/quotations", { params });
      setQuotations(res.data.quotations || []);
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (id) => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft quotation?")) return;
    try {
      await axiosInstance.delete(`/quotations/${id}`);
      toast.success("Quotation deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotation Management</h1>
            <p className="text-sm text-gray-500">Create, review and manage all quotations.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm"
          >
            + New Quotation
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-5">
          <input className="border rounded-lg p-2 text-sm" placeholder="Search customer / number" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" className="border rounded-lg p-2 text-sm" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className="border rounded-lg p-2 text-sm" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">No.</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
                ) : quotations.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">No quotations found.</td></tr>
                ) : quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{q.quotationNumber}</td>
                    <td className="p-3">
                      <div className="font-medium">{q.customerName}</div>
                      <div className="text-xs text-gray-500">{q.customerEmail}</div>
                    </td>
                    <td className="p-3">{q.associate?.name}</td>
                    <td className="p-3 font-semibold">₹{(q.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3 text-gray-500">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 font-medium text-xs hover:underline">View</Link>
                        {q.status === "Draft" && (
                          <>
                            <button onClick={() => handleSend(q._id)} className="text-green-700 font-medium text-xs hover:underline">Send</button>
                            <button onClick={() => handleDelete(q._id)} className="text-red-600 font-medium text-xs hover:underline">Delete</button>
                          </>
                        )}
                        <a href={`http://localhost:3000/api/quotations/${q._id}/pdf`} target="_blank" rel="noreferrer" className="text-purple-700 font-medium text-xs hover:underline">PDF</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showCreate && <CreateQuotationModal onClose={() => setShowCreate(false)} onCreated={load} />}
      </div>
    </DashboardLayout>
  );
};

const CreateQuotationModal = ({ onClose, onCreated }) => {
  const [services, setServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", notes: "", terms: "" });
  const [lines, setLines] = useState([{ name: "", price: "", quantity: 1 }]);
  const [discountType, setDiscountType] = useState("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  useEffect(() => {
    axiosInstance.get("/business/services").then((r) => setAllServices(r.data.services || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        services: lines.filter((l) => l.name && l.price).map((l) => ({ name: l.name, price: Number(l.price), quantity: Number(l.quantity || 1), amount: Number(l.price) * Number(l.quantity || 1) })),
        discount: { type: discountType, value: Number(discountValue) },
        tax: { percent: Number(taxPercent) },
      };
      await axiosInstance.post("/quotations", payload);
      toast.success("Quotation draft created");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create");
    }
  };

  const addLine = () => setLines([...lines, { name: "", price: "", quantity: 1 }]);
  const updateLine = (i, key, val) => setLines(lines.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">New Quotation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded-lg p-2 text-sm" placeholder="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
            <input className="border rounded-lg p-2 text-sm" placeholder="Customer Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            <input className="border rounded-lg p-2 text-sm" placeholder="Customer Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Service Lines</p>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2 mb-2">
                <input className="border rounded-lg p-2 text-sm" placeholder="Service name" value={line.name} onChange={(e) => updateLine(i, "name", e.target.value)} />
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Price" value={line.price} onChange={(e) => updateLine(i, "price", e.target.value)} />
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Qty" min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-sm text-blue-700">+ Add line</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="border rounded-lg p-2 text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="flat">Flat Discount</option>
              <option value="percentage">% Discount</option>
            </select>
            <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Discount value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Tax %" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
          </div>

          <textarea className="border rounded-lg p-2 text-sm w-full" placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <textarea className="border rounded-lg p-2 text-sm w-full" placeholder="Terms & Conditions" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />

          <button type="submit" className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm">Create Draft</button>
        </form>
      </div>
    </div>
  );
};

export default ManageQuotations;
