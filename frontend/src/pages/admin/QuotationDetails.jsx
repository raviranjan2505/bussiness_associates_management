import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const QuotationDetails = () => {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    try {
      const res = await axiosInstance.get(`/quotations/${id}`);
      setQuotation(res.data);
      setEditForm({
        notes: res.data.notes || "",
        terms: res.data.terms || "",
        "discount.type": res.data.discount?.type || "flat",
        "discount.value": res.data.discount?.value || 0,
        "tax.percent": res.data.tax?.percent || 0,
      });
    } catch {
      toast.error("Failed to load quotation");
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = async () => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const handleSaveEdit = async () => {
    try {
      await axiosInstance.put(`/quotations/${id}`, {
        notes: editForm.notes,
        terms: editForm.terms,
        discount: { type: editForm["discount.type"], value: Number(editForm["discount.value"]) },
        tax: { percent: Number(editForm["tax.percent"]) },
      });
      toast.success("Quotation updated");
      setEditMode(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  if (!quotation) return <DashboardLayout activeMenu="Quotations"><div className="p-6">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/admin/quotations" className="text-sm text-blue-700">← Back to Quotations</Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
            <p className="text-sm text-gray-500">{quotation.customerName} • {moment(quotation.createdAt).format("DD MMM YYYY")}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <StatusBadge status={quotation.status} />
            {quotation.status === "Draft" && <button onClick={handleSend} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Send to Associate</button>}
            {["Draft","Sent"].includes(quotation.status) && !editMode && <button onClick={() => setEditMode(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Edit</button>}
            <a href={`http://localhost:3000/api/quotations/${id}/pdf`} target="_blank" rel="noreferrer" className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">Download PDF</a>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main */}
          <div className="xl:col-span-2 space-y-6">
            {/* Customer */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Customer Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Name" value={quotation.customerName} />
                <Info label="Email" value={quotation.customerEmail} />
                <Info label="Phone" value={quotation.customerPhone} />
                <Info label="Associate" value={quotation.associate?.name} />
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Services</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-2 text-left">Service</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.services?.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{s.name}</td>
                      <td className="p-2 text-right">{fmt(s.price)}</td>
                      <td className="p-2 text-right">{s.quantity}</td>
                      <td className="p-2 text-right font-medium">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Notes / Terms edit */}
            {editMode && (
              <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Edit Details</h2>
                <div className="grid grid-cols-3 gap-3">
                  <select className="border rounded-lg p-2 text-sm" value={editForm["discount.type"]} onChange={(e) => setEditForm({ ...editForm, "discount.type": e.target.value })}>
                    <option value="flat">Flat Discount</option>
                    <option value="percentage">% Discount</option>
                  </select>
                  <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Discount" value={editForm["discount.value"]} onChange={(e) => setEditForm({ ...editForm, "discount.value": e.target.value })} />
                  <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Tax %" value={editForm["tax.percent"]} onChange={(e) => setEditForm({ ...editForm, "tax.percent": e.target.value })} />
                </div>
                <textarea className="border rounded-lg p-2 text-sm w-full" rows={2} placeholder="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                <textarea className="border rounded-lg p-2 text-sm w-full" rows={2} placeholder="Terms" value={editForm.terms} onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                  <button onClick={() => setEditMode(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </section>
            )}
          </div>

          {/* Totals sidebar */}
          <aside>
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Summary</h2>
              <div className="space-y-2 text-sm">
                <Row label="Subtotal" value={fmt(quotation.subtotal)} />
                {quotation.discount?.amount > 0 && <Row label={`Discount (${quotation.discount.type})`} value={`- ${fmt(quotation.discount.amount)}`} />}
                {quotation.tax?.amount > 0 && <Row label={`Tax (${quotation.tax.percent}%)`} value={fmt(quotation.tax.amount)} />}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total</span><span>{fmt(quotation.totalAmount)}</span>
                </div>
              </div>
              {quotation.notes && <div className="mt-4 text-sm"><p className="text-gray-500 uppercase text-xs mb-1">Notes</p><p>{quotation.notes}</p></div>}
              {quotation.terms && <div className="mt-3 text-sm"><p className="text-gray-500 uppercase text-xs mb-1">Terms</p><p>{quotation.terms}</p></div>}
              {quotation.rejectionReason && (
                <div className="mt-3 text-sm">
                  <p className="text-red-600 uppercase text-xs mb-1">Rejection Reason</p>
                  <p className="text-red-700">{quotation.rejectionReason}</p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500 uppercase">{label}</p>
    <p className="font-medium text-gray-900">{value || "-"}</p>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default QuotationDetails;
