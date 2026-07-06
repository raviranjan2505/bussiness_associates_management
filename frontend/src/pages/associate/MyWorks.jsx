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

  // Date range filter (applied only when "Filter" is clicked)
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });

  // Summary cards
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, rejected: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const load = async (range = appliedRange) => {
    try {
      setLoading(true);
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const res = await axiosInstance.get("/business/works", { params });
      setWorks(res.data.works || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load works");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (range = appliedRange) => {
    try {
      setSummaryLoading(true);
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const res = await axiosInstance.get("/business/works/summary", { params });
      setSummary({
        total: res.data.total || 0,
        pending: res.data.pending || 0,
        completed: res.data.completed || 0,
        rejected: res.data.rejected || 0,
      });
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load work summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadSummary();
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return works.filter((w) => {
      const matchSearch =
        !q ||
        [
          w.workId,
          w.clientDetails?.clientName,
          w.clientDetails?.mobileNumber,
          w.clientDetails?.email,
          w.service?.name,
          w.division?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
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
            <span className="text-sm text-gray-500">
              {filtered.length} of {works.length}
            </span>
            <button
              onClick={() => { load(); loadSummary(); }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Work</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summaryLoading ? "…" : summary.total}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending Work</p>
            <p className="mt-1 text-2xl font-bold text-gray-600">{summaryLoading ? "…" : summary.pending}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed Work</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{summaryLoading ? "…" : summary.completed}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Rejected Work</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summaryLoading ? "…" : summary.rejected}</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[180px_180px_100px_100px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              className="w-full rounded-lg border p-2.5 text-sm focus:border-gray-400 focus:outline-none"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              className="w-full rounded-lg border p-2.5 text-sm focus:border-gray-400 focus:outline-none"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </div>
          <button
            onClick={handleFilter}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Filter
          </button>
          <button
            onClick={handleReset}
            className="mt-5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
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
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
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
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Loading works…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      {search || status
                        ? "No works match your filters."
                        : "No works submitted yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((work) => (
                    <tr
                      key={work._id}
                      onClick={() => navigate(`/associate/work/${work._id}`)}
                      className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-3 font-mono text-xs font-semibold text-gray-800">
                        {work.workId || "—"}
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-gray-900">
                          {work.clientDetails?.clientName || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {work.clientDetails?.mobileNumber || ""}
                          {work.clientDetails?.email
                            ? ` · ${work.clientDetails.email}`
                            : ""}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default MyWorks;