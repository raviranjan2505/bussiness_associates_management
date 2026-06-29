import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { STATUS_DATA } from "../../utils/data";

const MyWorks = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/business/works");
      setWorks(res.data.works || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load works");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return works.filter((w) => {
      const matchSearch = !q || [
        w.workId,
        w.clientDetails?.clientName,
        w.clientDetails?.mobileNumber,
        w.clientDetails?.email,
        w.service?.name,
        w.division?.name,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchStatus = !status || w.status === status;
      return matchSearch && matchStatus;
    });
  }, [works, search, status]);

  return (
    <DashboardLayout activeMenu="My Works">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Works</h1>
            <p className="text-sm text-gray-500">
              All work submissions. Click a row to view full details and track status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filtered.length} of {works.length}</span>
            <button
              onClick={load}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[1fr_240px]">
          <input
            className="w-full rounded-lg border p-3 text-sm focus:border-gray-400 focus:outline-none"
            placeholder="Search by work ID, client name, mobile, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border p-3 text-sm focus:border-gray-400 focus:outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_DATA.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Work ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Division</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">Loading works…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      {search || status ? "No works match your filters." : "No works submitted yet."}
                    </td>
                  </tr>
                ) : filtered.map((work) => (
                  <tr
                    key={work._id}
                    onClick={() => navigate(`/associate/work/${work._id}`)}
                    className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs font-semibold text-gray-800">
                      {work.workId || "—"}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{work.clientDetails?.clientName || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {work.clientDetails?.mobileNumber || ""}
                        {work.clientDetails?.email ? ` · ${work.clientDetails.email}` : ""}
                      </p>
                    </td>
                    <td className="p-3 text-gray-700">{work.service?.name || "—"}</td>
                    <td className="p-3 text-gray-600">{work.division?.name || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={work.status || "Pending"} />
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {moment(work.createdAt).format("DD MMM YYYY")}
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {moment(work.updatedAt).format("DD MMM YYYY")}
                    </td>
                    <td className="p-3 text-gray-400 text-right">›</td>
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

export default MyWorks;