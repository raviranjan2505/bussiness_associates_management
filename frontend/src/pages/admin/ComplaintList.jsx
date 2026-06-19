import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUS_DATA } from "../../utils/data";

const ComplaintList = () => {
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/complaints", { params });
    setComplaints(res.data.complaints || []);
  };

  useEffect(() => { load().catch(console.error); }, [filters.status]);

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500">Review and respond to associate complaints.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["", "Pending", "In Review", "Resolved", "Closed"].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                filters.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap gap-3">
          <input className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Search complaint #, subject..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {COMPLAINT_STATUS_DATA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Apply</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Number</th><th className="p-3">Subject</th>
                  <th className="p-3">Associate</th><th className="p-3">Status</th>
                  <th className="p-3">Raised</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.complaintNumber}</td>
                    <td className="p-3">
                      <p className="font-medium">{c.subject}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{c.description}</p>
                    </td>
                    <td className="p-3">{c.associate?.name}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                    <td className="p-3">{moment(c.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <Link to={`/admin/complaints/${c._id}`} className="text-blue-700 font-medium text-xs">View & Reply</Link>
                    </td>
                  </tr>
                ))}
                {!complaints.length && (
                  <tr><td colSpan={6} className="p-4 text-gray-400 text-center">No complaints found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ComplaintList;
