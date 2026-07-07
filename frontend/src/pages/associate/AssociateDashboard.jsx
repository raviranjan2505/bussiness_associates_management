import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { FileText, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import axiosInstance from "../../utils/axioInstance";

const AssociateDashboard = () => {
  const [data, setData] = useState({ statistics: {}, recentWorks: [] });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    axiosInstance.get("/business/dashboard/associate").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const s = data.statistics || {};
  const recentWorks = data.recentWorks || [];
  const totalPages = Math.max(Math.ceil(recentWorks.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pagedWorks = recentWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Associate Dashboard</h1>
            <p className="text-sm text-gray-500">Track your work submissions and progress.</p>
          </div>
          <Link to="/associate/submit-work" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-center text-sm">
            Submit Work
          </Link>
        </div>

        {/* ── Announcements Banner ──────────────────────── */}
        <AnnouncementBanner />

        {/* ── Work counters ─────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">My Work</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatLink icon={FileText}     title="Submitted Work" value={s.mySubmittedWork || 0}   to="/associate/works" color="indigo" />
            <StatLink icon={Clock}        title="Pending"        value={s.Pending || 0}           to="/associate/works?status=Pending" color="amber" />
            <StatLink icon={CheckCircle2} title="Completed"      value={s.Completed || 0}         to="/associate/works?status=Completed" color="emerald" />
            <StatLink icon={IndianRupee}  title="My Income"      value={`₹${Number(s.totalIncome || 0).toLocaleString("en-IN")}`} to="/associate/income" color="green" />
          </div>
        </section>

        {/* ── Recent activity ─────────────────────────────── */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            {recentWorks.length > 0 && (
              <span className="text-xs text-gray-500">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, recentWorks.length)} of {recentWorks.length}
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Work ID</th>
                <th className="p-3">Client</th>
                <th className="p-3">Service</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pagedWorks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">No recent activity.</td>
                </tr>
              ) : (
                pagedWorks.map((work) => (
                  <tr key={work._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{work.workId}</td>
                    <td className="p-3">{work.clientDetails?.clientName}</td>
                    <td className="p-3">{work.service?.name}</td>
                    <td className="p-3"><StatusBadge status={work.status} /></td>
                    <td className="p-3">{moment(work.updatedAt).format("DD MMM YYYY hh:mm A")}</td>
                    <td className="p-3">
                      <Link className="text-blue-700 font-medium" to={`/associate/work/${work._id}`}>Track</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-3">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

const STAT_COLORS = {
  blue:    { bg: "from-blue-50 to-white",       icon: "bg-blue-600/10 text-blue-600",       value: "text-blue-950",    ring: "hover:ring-blue-100" },
  indigo:  { bg: "from-indigo-50 to-white",     icon: "bg-indigo-600/10 text-indigo-600",   value: "text-indigo-950",  ring: "hover:ring-indigo-100" },
  amber:   { bg: "from-amber-50 to-white",      icon: "bg-amber-500/15 text-amber-600",     value: "text-amber-950",   ring: "hover:ring-amber-100" },
  emerald: { bg: "from-emerald-50 to-white",    icon: "bg-emerald-600/10 text-emerald-600", value: "text-emerald-950", ring: "hover:ring-emerald-100" },
  green:   { bg: "from-green-50 to-white",      icon: "bg-green-600/10 text-green-600",     value: "text-green-950",   ring: "hover:ring-green-100" },
  purple:  { bg: "from-purple-50 to-white",     icon: "bg-purple-600/10 text-purple-600",   value: "text-purple-950",  ring: "hover:ring-purple-100" },
  rose:    { bg: "from-rose-50 to-white",       icon: "bg-rose-600/10 text-rose-600",       value: "text-rose-950",    ring: "hover:ring-rose-100" },
  red:     { bg: "from-red-50 to-white",        icon: "bg-red-600/10 text-red-600",         value: "text-red-950",     ring: "hover:ring-red-100" },
};

const Stat = ({ title, value, color = "blue", icon: Icon, clickable = false }) => {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br ${c.bg} p-4 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.ring} ${clickable ? "cursor-pointer" : ""}`}
    >
      {Icon && (
        <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${c.value}`}>{value}</p>
      {clickable && (
        <span className="pointer-events-none absolute right-4 top-4 text-gray-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          →
        </span>
      )}
    </div>
  );
};

const StatLink = ({ title, value, to, color, icon }) => (
  <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300 rounded-xl">
    <Stat title={title} value={value} color={color} icon={icon} clickable />
  </Link>
);

export default AssociateDashboard;