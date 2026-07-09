import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUSES } from "../../utils/data";

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const { page, totalPages, paged: pagedComplaints, resetPage, onPrev, onNext } = usePagination(complaints, 10);

  const load = async () => {
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await axiosInstance.get("/complaints", { params: p });
    setComplaints(res.data.complaints || []);
    resetPage();
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500">Review and resolve associate complaints.</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-lg p-4">
          <input className="border rounded-lg p-2 flex-1 min-w-[200px]" placeholder="Search by subject…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Complaint #</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Raised</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedComplaints.map((c) => (
                  <tr key={c._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.complaintNumber}</td>
                    <td className="p-3 max-w-[250px] truncate">{c.subject}</td>
                    <td className="p-3">{c.associate?.name}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                    <td className="p-3">{moment(c.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <Link to={`/admin/complaints/${c._id}`} className="text-blue-700 text-xs font-medium hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!complaints.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={6}>No complaints found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={complaints.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminComplaints;
