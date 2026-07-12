import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { FileText, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import { StatCardLink } from "../../components/StatCard";
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Associate Dashboard</h1>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardLink icon={FileText}     title="Submitted Work" value={s.mySubmittedWork || 0}   to="/associate/works" color="indigo" />
            <StatCardLink icon={Clock}        title="Pending"        value={s.Pending || 0}           to="/associate/works?status=Pending" color="amber" />
            <StatCardLink icon={CheckCircle2} title="Completed"      value={s.Completed || 0}         to="/associate/works?status=Completed" color="emerald" />
            <StatCardLink icon={IndianRupee}  title="My Income"      value={`₹${Number(s.totalIncome || 0).toLocaleString("en-IN")}`} to="/associate/income" color="green" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
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

export default AssociateDashboard;