import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const ReviewWorks = () => {
  const [works, setWorks] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const res = await axiosInstance.get("/business/works", { params });
    setWorks(res.data.works || []);
  };

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <DashboardLayout activeMenu="Review Work">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Submitted Work</h1>
            <p className="text-sm text-gray-500">Search, filter, review documents, and update status.</p>
          </div>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Apply Filters</button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-4">
          <input className="border rounded-lg p-2" placeholder="Work ID, client, mobile" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {["Pending", "Under Review", "Documents Required", "In Process", "Completed", "Rejected"].map((status) => <option key={status}>{status}</option>)}
          </select>
          <input type="date" className="border rounded-lg p-2" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className="border rounded-lg p-2" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr><th className="p-3">Work ID</th><th className="p-3">Client</th><th className="p-3">Division</th><th className="p-3">Service</th><th className="p-3">Associate</th><th className="p-3">Status</th><th className="p-3">Submitted</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work._id} className="border-t">
                    <td className="p-3 font-medium">{work.workId}</td>
                    <td className="p-3">{work.clientDetails?.clientName}</td>
                    <td className="p-3">{work.division?.name}</td>
                    <td className="p-3">{work.service?.name}</td>
                    <td className="p-3">{work.associate?.name}</td>
                    <td className="p-3"><StatusBadge status={work.status} /></td>
                    <td className="p-3">{moment(work.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3"><Link className="text-blue-700 font-medium" to={`/admin/work/${work._id}`}>Open</Link></td>
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

export default ReviewWorks;
