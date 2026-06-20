import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import axiosInstance from "../../utils/axioInstance";

const AssociateDashboard = () => {
  const [data, setData] = useState({ statistics: {}, recentWorks: [] });

  useEffect(() => {
    axiosInstance.get("/business/dashboard/associate").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const s = data.statistics || {};

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Associate Dashboard</h1>
            <p className="text-sm text-gray-500">Track submissions, quotations, invoices and complaints.</p>
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
            <Stat title="Submitted Work"     value={s.mySubmittedWork || 0}   color="indigo" />
            <Stat title="Pending"            value={s.Pending || 0}           color="amber" />
            <Stat title="Completed"          value={s.Completed || 0}         color="emerald" />
            <Stat title="My Income" value={`₹${Number(s.totalIncome || 0).toLocaleString("en-IN")}`} color="green" />
          </div>
        </section>

        {/* ── Quotation counters ─────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Quotations</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatLink title="My Quotations"    value={s.myQuotations || 0}      to="/associate/quotations"                        color="purple" />
            <StatLink title="Approved"         value={s.approvedQuotations || 0} to="/associate/quotations?status=Accepted"       color="green" />
            <StatLink title="Rejected"         value={s.rejectedQuotations || 0} to="/associate/quotations?status=Rejected"       color="red" />
          </div>
        </section>

        {/* ── Invoice / Project counters ─────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Invoices & Projects</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatLink title="My Invoices"     value={s.myInvoices || 0}       to="/associate/invoices"                              color="blue" />
            <StatLink title="Pending Payment" value={s.pendingPayments || 0}  to="/associate/invoices?invoiceStatus=Waiting+For+Payment" color="amber" />
            <StatLink title="Active Projects" value={s.activeProjects || 0}   to="/associate/invoices"                              color="indigo" />
            <StatLink title="Complaints"      value={s.myComplaints || 0}     to="/associate/complaints"                            color="rose" />
          </div>
        </section>

        {/* ── Recent activity ─────────────────────────────── */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Recent Activity</h2></div>
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
              {data.recentWorks.map((work) => (
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
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
};

const Stat = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-900",
    indigo: "bg-indigo-50 text-indigo-900",
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
    green: "bg-green-50 text-green-900",
    purple: "bg-purple-50 text-purple-900",
    red: "bg-red-50 text-red-900",
    rose: "bg-rose-50 text-rose-900",
  };
  return (
    <div className={`rounded-lg p-4 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
};

const StatLink = ({ title, value, to, color }) => (
  <Link to={to}><Stat title={title} value={value} color={color} /></Link>
);

export default AssociateDashboard;
