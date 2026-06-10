import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const MyWorks = () => {
  const [works, setWorks] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const res = await axiosInstance.get("/business/works", { params });
    setWorks(res.data.works || []);
  };

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <DashboardLayout activeMenu="Track Work">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submitted Work</h1>
          <p className="text-sm text-gray-500">Track status timelines and respond to document requests.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_220px_120px]">
          <input className="border rounded-lg p-2" placeholder="Client or work ID" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {["Pending", "Under Review", "Documents Required", "In Process", "Completed", "Rejected"].map((status) => <option key={status}>{status}</option>)}
          </select>
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => (
            <Link key={work._id} to={`/associate/work/${work._id}`} className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-300">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{work.workId}</p>
                  <p className="text-sm text-gray-500">{work.clientDetails?.clientName}</p>
                </div>
                <StatusBadge status={work.status} />
              </div>
              <p className="mt-3 text-sm text-gray-700">{work.division?.name} / {work.service?.name}</p>
              <p className="mt-2 text-xs text-gray-500">Submitted {moment(work.createdAt).format("DD MMM YYYY hh:mm A")}</p>
            </Link>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default MyWorks;
