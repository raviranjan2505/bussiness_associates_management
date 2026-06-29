import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});


  const load = async () => {
    const res = await axiosInstance.get(`/quotations/${id}`);
    setQuotation(res.data);
    setEditForm({
      notes: res.data.notes || "",
      terms: res.data.terms || "",
      discountType: res.data.discount?.type || "flat",
      discountValue: res.data.discount?.value || 0,
      taxPercent: res.data.tax?.percent || 0,
    });
  };

  useEffect(() => { load().catch(console.error); }, [id]);

  const handleSend = async () => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/quotations/${id}`, {
        notes: editForm.notes,
        terms: editForm.terms,
        discount: { type: editForm.discountType, value: Number(editForm.discountValue) },
        tax: { percent: Number(editForm.taxPercent) },
      });
      toast.success("Quotation updated");
      setEditMode(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving");
    }
  };

  if (!quotation) return <DashboardLayout activeMenu="Quotations"><div className="p-6">Loading...</div></DashboardLayout>;

  const q = quotation;

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-6">
        {/* Title bar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <button onClick={() => navigate("/admin/quotations")} className="text-sm text-blue-700 font-medium mb-1 block">
              ← Back to Quotations
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{q.quotationNumber}</h1>
            <p className="text-sm text-gray-500">{q.customerName} · {q.associate?.name}</p>
          </div>

 
          <div className="flex gap-3 items-center flex-wrap">
            <StatusBadge status={q.status} />
            {q.status === "Draft" && (
              <button onClick={handleSend} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">
                Send to Associate
              </button>
            )}
            {["Draft", "Sent"].includes(q.status) && (
              <button onClick={() => setEditMode(!editMode)} className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 text-sm">
                {editMode ? "Cancel Edit" : "Edit"}
              </button>
            )}
            <a
              href={`http://localhost:3000/api/quotations/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Left: service lines + customer */}
          <div className="xl:col-span-2 space-y-5">
            {/* Customer */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <Info label="Name" value={q.customerName} />
                <Info label="Email" value={q.customerEmail} />
                <Info label="Phone" value={q.customerPhone} />
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Services</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">Service</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {q.services?.map((svc, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{svc.name}</p>
                        {svc.description && <p className="text-xs text-gray-400">{svc.description}</p>}
                      </td>
                      <td className="p-3 text-right">{fmt(svc.price)}</td>
                      <td className="p-3 text-right">{svc.quantity}</td>
                      <td className="p-3 text-right font-medium">{fmt(svc.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="p-5 border-t bg-gray-50 flex justify-end">
                <div className="space-y-1 text-sm min-w-[220px]">
                  <TotalRow label="Subtotal" value={fmt(q.subtotal)} />
                  {q.discount?.amount > 0 && (
                    <TotalRow label={`Discount (${q.discount.type === "percentage" ? q.discount.value + "%" : "flat"})`} value={`- ${fmt(q.discount.amount)}`} />
                  )}
                  {q.tax?.amount > 0 && (
                    <TotalRow label={`Tax (${q.tax.percent}%)`} value={fmt(q.tax.amount)} />
                  )}
                  <div className="border-t pt-1 mt-1">
                    <TotalRow label="Total" value={fmt(q.totalAmount)} bold />
                  </div>
                </div>
              </div>
            </section>

            {/* Rejection reason */}
            {q.status === "Rejected" && q.rejectionReason && (
              <section className="bg-red-50 border border-red-100 rounded-lg p-5">
                <h2 className="font-semibold text-red-800 mb-1">Rejection Reason</h2>
                <p className="text-sm text-red-700">{q.rejectionReason}</p>
              </section>
            )}
          </div>

          {/* Right: edit panel + meta */}
          <aside className="space-y-5">
            <section className="bg-white border border-gray-100 rounded-lg p-5 text-sm space-y-3">
              <h2 className="font-semibold text-gray-900">Details</h2>
              <Info label="Status" value={<StatusBadge status={q.status} />} />
              <Info label="Created" value={moment(q.createdAt).format("DD MMM YYYY")} />
              {q.sentAt && <Info label="Sent" value={moment(q.sentAt).format("DD MMM YYYY")} />}
              {q.respondedAt && <Info label="Responded" value={moment(q.respondedAt).format("DD MMM YYYY")} />}
              {q.validUntil && <Info label="Valid Until" value={moment(q.validUntil).format("DD MMM YYYY")} />}
              {q.notes && <Info label="Notes" value={q.notes} />}
              {q.terms && <Info label="Terms" value={q.terms} />}
            </section>

            {editMode && (
              <form onSubmit={handleSaveEdit} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Edit Quotation</h2>
                <div>
                  <label className="text-xs font-medium text-gray-600">Discount Type</label>
                  <select className="w-full border rounded-lg p-2 mt-1" value={editForm.discountType} onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value })}>
                    <option value="flat">Flat (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Discount Value</label>
                  <input type="number" min="0" className="w-full border rounded-lg p-2 mt-1" value={editForm.discountValue} onChange={(e) => setEditForm({ ...editForm, discountValue: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Tax %</label>
                  <input type="number" min="0" max="100" className="w-full border rounded-lg p-2 mt-1" value={editForm.taxPercent} onChange={(e) => setEditForm({ ...editForm, taxPercent: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Notes</label>
                  <textarea className="w-full border rounded-lg p-2 mt-1" rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Terms & Conditions</label>
                  <textarea className="w-full border rounded-lg p-2 mt-1" rows={3} value={editForm.terms} onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })} />
                </div>
                <button className="bg-gray-900 text-white rounded-lg px-4 py-2 w-full">Save Changes</button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase text-gray-400 font-medium">{label}</p>
    <div className="mt-0.5 text-gray-900">{value || "–"}</div>
  </div>
);

const TotalRow = ({ label, value, bold }) => (
  <div className={`flex justify-between ${bold ? "font-bold text-gray-900" : "text-gray-600"}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const StatLink = ({ title, value, to, color }) => (
  <Link to={to}>
    <Stat title={title} value={value} color={color} />
  </Link>
);

export default QuotationDetail;
