import React, { useEffect, useState } from "react";
import moment from "moment";
import { Link } from "react-router-dom";
import { Users, Briefcase, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import CustomBarChart from "../../components/CustomBarChart";
import CustomPieChart from "../../components/CustomPieChart";
import { StatCardLink } from "../../components/StatCard";
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
            <StatCardLink icon={Users}        title="Total Associates"    value={s.totalAssociates || 0} to="/admin/users" color="blue" />
            <StatCardLink icon={Briefcase}    title="Total Work Requests" value={s.totalWorkRequests || 0} to="/admin/projects" color="indigo" />
            <StatCardLink icon={Clock}        title="Pending Works"       value={s.Pending || 0} to="/admin/projects?status=Pending" color="amber" />
            <StatCardLink icon={CheckCircle2} title="Completed Works"     value={s.Completed || 0} to="/admin/projects?status=Completed" color="emerald" />
            <StatCardLink icon={IndianRupee}  title="Total Income"        value={`₹${(s.totalIncome || 0).toLocaleString("en-IN")}`} to="/admin/income" color="green" />
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

export default BusinessDashboard;