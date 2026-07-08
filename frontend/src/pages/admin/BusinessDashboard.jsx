import React, { useEffect, useState } from "react";
import moment from "moment";
import { Link } from "react-router-dom";
import { Users, Briefcase, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import CustomBarChart from "../../components/CustomBarChart";
import CustomPieChart from "../../components/CustomPieChart";
import axiosInstance from "../../utils/axioInstance";

const statusKeys = ["Pending", "Under Review", "Documents Required", "In Process", "Completed", "Rejected"];

const BusinessDashboard = () => {
  const [data, setData] = useState({ statistics: {}, recentWorks: [], byDivision: [], byService: [] });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    axiosInstance.get("/business/dashboard/admin").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const s = data.statistics || {};
  const pieData = statusKeys.map((status) => ({ status, count: s[status] || 0 }));
  const hasPieData = pieData.some((d) => d.count > 0);
  const barData = (data.byDivision || []).map((x) => ({ priority: x.name, count: x.count }));
  const hasBarData = barData.length > 0;

  const recentWorks = data.recentWorks || [];
  const totalPages = Math.max(Math.ceil(recentWorks.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pagedWorks = recentWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-sm text-gray-500">{moment().format("dddd, DD MMMM YYYY")}</p>
        </div>

        {/* ── Announcements Banner ──────────────────────── */}
        <AnnouncementBanner />

        {/* ── Work counters ─────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Work Overview</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatLink icon={Users}        title="Total Associates"    value={s.totalAssociates || 0} to="/admin/users" color="blue" />
            <StatLink icon={Briefcase}    title="Total Work Requests" value={s.totalWorkRequests || 0} to="/admin/projects" color="indigo" />
            <StatLink icon={Clock}        title="Pending Works"       value={s.Pending || 0} to="/admin/projects?status=Pending" color="amber" />
            <StatLink icon={CheckCircle2} title="Completed Works"     value={s.Completed || 0} to="/admin/projects?status=Completed" color="emerald" />
            <StatLink icon={IndianRupee}  title="Total Income"        value={`₹${(s.totalIncome || 0).toLocaleString("en-IN")}`} to="/admin/income" color="green" />
          </div>
        </section>

        {/* ── Charts ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/60 p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Work Status Distribution</h2>
            <div className="h-72 w-full sm:h-80 md:h-96">
              {hasPieData ? (
                <CustomPieChart data={pieData} colors={["#f59e0b","#0ea5e9","#e11d48","#4f46e5","#10b981","#dc2626"]} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No work data yet.</div>
              )}
            </div>
          </section>
          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/60 p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Division-wise Statistics</h2>
            <div className="h-72 w-full sm:h-80 md:h-96">
              {hasBarData ? (
                <CustomBarChart data={barData} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No division data yet.</div>
              )}
            </div>
          </section>
        </div>

        {/* ── Recent activity ─────────────────────────────── */}
        <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activities</h2>
            {recentWorks.length > 0 && (
              <span className="text-xs text-gray-500">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, recentWorks.length)} of {recentWorks.length}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Work ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {pagedWorks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">No recent activity.</td>
                  </tr>
                ) : (
                  pagedWorks.map((work) => (
                    <tr key={work._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        <Link to={`/admin/work/${work._id}`} className="text-blue-600 hover:underline">
                          {work.workId}
                        </Link>
                      </td>
                      <td className="p-3">{work.clientDetails?.clientName}</td>
                      <td className="p-3">{work.service?.name}</td>
                      <td className="p-3"><StatusBadge status={work.status} /></td>
                      <td className="p-3">{moment(work.updatedAt).format("DD MMM YYYY hh:mm A")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
  gray:    { bg: "from-gray-50 to-white",       icon: "bg-gray-600/10 text-gray-600",       value: "text-gray-900",    ring: "hover:ring-gray-100" },
  red:     { bg: "from-red-50 to-white",        icon: "bg-red-600/10 text-red-600",         value: "text-red-950",     ring: "hover:ring-red-100" },
};

const Stat = ({ title, value, color = "blue", icon: Icon, clickable = false }) => {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br ${c.bg} p-5 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.ring} ${clickable ? "cursor-pointer" : ""}`}
    >
      {Icon && (
        <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${c.value}`}>{value}</p>
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

export default BusinessDashboard;