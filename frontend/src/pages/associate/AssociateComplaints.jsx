import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUSES } from "../../utils/data";

const AssociateComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "" });
  const [files, setFiles] = useState([]);
  const [filters, setFilters] = useState({ status: "" });

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/complaints", { params: p });
    setComplaints(res.data.complaints || []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) return toast.error("Subject and description are required");
    const fd = new FormData();
    fd.append("subject", form.subject);
    fd.append("description", form.description);
    files.forEach((f) => fd.append("attachments", f));
    try {
      await axiosInstance.post("/complaints", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Complaint submitted");
      setShowForm(false);
      setForm({ subject: "", description: "" });
      setFiles([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    }
  };

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
            <p className="text-sm text-gray-500">Raise and track complaints with admin support.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            + Raise Complaint
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">New Complaint</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input className="w-full border rounded-lg p-3" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea rows={4} className="w-full border rounded-lg p-3" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
              <input type="file" multiple className="w-full border rounded-lg p-2"
                onChange={(e) => setFiles(Array.from(e.target.files))} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm">Submit</button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 rounded-lg px-5 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        <div className="space-y-3">
          {complaints.map((c) => (
            <Link key={c._id} to={`/associate/complaints/${c._id}`}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm hover:border-gray-300 transition-all">
              <div>
                <p className="font-semibold text-gray-900">{c.complaintNumber}: {c.subject}</p>
                <p className="text-xs text-gray-500 mt-1">{moment(c.createdAt).format("DD MMM YYYY hh:mm A")}</p>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
          {!complaints.length && (
            <div className="text-center py-12 text-gray-500">No complaints found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssociateComplaints;
