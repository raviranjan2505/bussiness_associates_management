import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUSES } from "../../utils/data";

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "" });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    try {
      const res = await axiosInstance.get("/complaints", { params });
      setComplaints(res.data.complaints || []);
    } catch { toast.error("Failed to load complaints"); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaint Management</h1>
          <p className="text-sm text-gray-500">Review, reply and resolve complaints raised by associates.</p>
        </div>

        <div className="flex gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 text-sm flex-1" placeholder="Search complaint / subject" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Filter</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr><th className="p-3">No.</th><th className="p-3">Subject</th><th className="p-3">Associate</th><th className="p-3">Status</th><th className="p-3">Raised On</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-500">No complaints found.</td></tr>
                  : complaints.map((c) => (
                    <tr key={c._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.complaintNumber}</td>
                      <td className="p-3 max-w-xs truncate">{c.subject}</td>
                      <td className="p-3">{c.associate?.name}</td>
                      <td className="p-3"><StatusBadge status={c.status} /></td>
                      <td className="p-3 text-gray-500">{moment(c.createdAt).format("DD MMM YYYY")}</td>
                      <td className="p-3"><Link to={`/admin/complaints/${c._id}`} className="text-blue-700 text-xs font-medium hover:underline">Open</Link></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageComplaints;
