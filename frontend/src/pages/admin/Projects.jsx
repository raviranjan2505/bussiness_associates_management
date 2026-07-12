import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { Briefcase, Clock, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import { StatCard } from "../../components/StatCard";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { STATUS_DATA } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminProjects = () => {
  const [params] = useSearchParams();
  const [works, setWorks] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: params.get("status") || params.get("projectStatus") || "",
  });
  const [loading, setLoading] = useState(false);

  // Date range filter (applied only when "Filter" is clicked)
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });

  // Summary cards
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, rejected: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const { page, totalPages, paged: pagedWorks, resetPage, onPrev, onNext } = usePagination(works, 10);

  const load = async (range = appliedRange) => {
    setLoading(true);
    resetPage();
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      if (range.from) p.from = range.from;
      if (range.to) p.to = range.to;
      const res = await axiosInstance.get("/business/works", { params: p });
      setWorks(res.data.works || []);
    } catch {
      toast.error("Failed to load works");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (range = appliedRange) => {
    setSummaryLoading(true);
    try {
      const p = {};
      if (range.from) p.from = range.from;
      if (range.to) p.to = range.to;
      const res = await axiosInstance.get("/business/works/summary", { params: p });
      setSummary({
        total: res.data.total || 0,
        pending: res.data.pending || 0,
        completed: res.data.completed || 0,
        rejected: res.data.rejected || 0,
      });
    } catch {
      toast.error("Failed to load work summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
    loadSummary().catch(console.error);
  }, []);

  const handleFilter = () => {
    const range = { from: fromInput, to: toInput };
    setAppliedRange(range);
    load(range);
    loadSummary(range);
  };

  const handleReset = () => {
    setFromInput("");
    setToInput("");
    const range = { from: "", to: "" };
    setAppliedRange(range);
    load(range);
    loadSummary(range);
  };

  return (
    <DashboardLayout activeMenu="Work">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Work List</h1>
            <p className="text-sm text-gray-500">Track every submitted work item from one screen.</p>
          </div>
          <button onClick={() => { load(); loadSummary(); }} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Briefcase}    title="Total Work"     value={summaryLoading ? "…" : summary.total}     color="blue" />
          <StatCard icon={Clock}        title="Pending Work"   value={summaryLoading ? "…" : summary.pending}   color="amber" />
          <StatCard icon={CheckCircle2} title="Completed Work" value={summaryLoading ? "…" : summary.completed} color="emerald" />
          <StatCard icon={XCircle}      title="Rejected Work"  value={summaryLoading ? "…" : summary.rejected}  color="red" />
        </div>

        {/* Date Range Filter */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[180px_180px_100px_100px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2.5 text-sm"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2.5 text-sm"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </div>
          <button onClick={handleFilter} className="mt-5 bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm">
            Filter
          </button>
          <button onClick={handleReset} className="mt-5 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_220px_100px]">
          <input
            className="border rounded-lg p-2 text-sm"
            placeholder="Search by work ID, client, service, or associate"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="border rounded-lg p-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Work Statuses</option>
            {STATUS_DATA.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button onClick={() => load()} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            Filter
          </button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3">Work ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Service</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : works.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      No works found.
                    </td>
                  </tr>
                ) : (
                  pagedWorks.map((work) => (
                    <tr key={work._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        <Link to={`/admin/work/${work._id}`} className="text-blue-700 hover:underline">
                          {work.workId}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{work.clientDetails?.clientName}</div>
                        <div className="text-xs text-gray-500">
                          {work.clientDetails?.mobileNumber || "-"}
                          {work.clientDetails?.email ? ` | ${work.clientDetails.email}` : ""}
                        </div>
                      </td>
                      <td className="p-3">{work.associate?.name}</td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{work.service?.name}</div>
                        <div className="text-xs text-gray-500">{work.division?.name || "-"}</div>
                      </td>
                      <td className="p-3 text-right font-medium">{formatMoney(work.servicePrice || work.service?.price || 0)}</td>
                      <td className="p-3">
                        <StatusBadge status={work.status} />
                      </td>
                      <td className="p-3 text-gray-500">
                        {work.updatedAt ? moment(work.updatedAt).format("DD MMM YYYY hh:mm A") : "-"}
                      </td>
                      <td className="p-3">
                        <Link to={`/admin/work/${work._id}`} className="text-blue-700 font-medium text-xs hover:underline">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={works.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminProjects;
