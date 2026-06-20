import React, { useEffect, useState } from "react";
import moment from "moment";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import CustomBarChart from "../../components/CustomBarChart";
import CustomPieChart from "../../components/CustomPieChart";
import axiosInstance from "../../utils/axioInstance";

const statusKeys = ["Pending", "Under Review", "Documents Required", "In Process", "Completed", "Rejected"];

const BusinessDashboard = () => {
  const [data, setData] = useState({ statistics: {}, recentWorks: [], byDivision: [], byService: [] });

  useEffect(() => {
    axiosInstance.get("/business/dashboard/admin").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const s = data.statistics || {};
  const pieData = statusKeys.map((status) => ({ status, count: s[status] || 0 }));

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-sm text-gray-500">{moment().format("dddd, DD MMMM YYYY")}</p>
        </div>

        {/* ── Work counters ─────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Work Overview</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat title="Total Associates"    value={s.totalAssociates || 0} color="blue" />
            <Stat title="Total Work Requests" value={s.totalWorkRequests || 0} color="indigo" />
            <Stat title="Pending Works"       value={s.Pending || 0} color="amber" />
            <Stat title="Completed Works"     value={s.Completed || 0} color="emerald" />
            <Stat title="Total Income"        value={`₹${(s.totalIncome || 0).toLocaleString("en-IN")}`} color="green" />
          </div>
        </section>

        {/* ── Quotation counters ─────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Quotations</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatLink title="Total Quotations"    value={s.totalQuotations || 0}    to="/admin/quotations"            color="purple" />
            <StatLink title="Draft"               value={s.draftQuotations || 0}    to="/admin/quotations?status=Draft"    color="gray" />
            <StatLink title="Accepted"            value={s.acceptedQuotations || 0} to="/admin/quotations?status=Accepted" color="green" />
            <StatLink title="Rejected"            value={s.rejectedQuotations || 0} to="/admin/quotations?status=Rejected" color="red" />
          </div>
        </section>

        {/* ── Invoice / Payment counters ─────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Invoices & Payments</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatLink title="Total Invoices"    value={s.totalInvoices || 0}        to="/admin/invoices"                    color="blue" />
            <StatLink title="Pending Payments"  value={s.pendingPaymentInvoices || 0} to="/admin/invoices?invoiceStatus=Waiting+For+Payment" color="amber" />
            <StatLink title="Paid Invoices"     value={s.paidInvoices || 0}         to="/admin/invoices?invoiceStatus=Paid" color="emerald" />
          </div>
        </section>

        {/* ── Project / Complaint counters ───────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Works & Complaints</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatLink title="Active Works"       value={s.activeProjects || 0}    to="/admin/projects"           color="indigo" />
            <StatLink title="Completed Works"    value={s.completedProjects || 0} to="/admin/projects?status=Completed" color="emerald" />
            <StatLink title="Total Complaints"   value={s.totalComplaints || 0}   to="/admin/complaints"         color="rose" />
          </div>
        </section>

        {/* ── Charts ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="bg-white p-5 rounded-lg border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Work Status Distribution</h2>
            <div className="h-64">
              <CustomPieChart data={pieData} colors={["#f59e0b","#0ea5e9","#e11d48","#4f46e5","#10b981","#dc2626"]} />
            </div>
          </section>
          <section className="bg-white p-5 rounded-lg border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Division-wise Statistics</h2>
            <div className="h-64">
              <CustomBarChart data={data.byDivision.map((x) => ({ priority: x.name, count: x.count }))} />
            </div>
          </section>
        </div>

        {/* ── Recent activity ─────────────────────────────── */}
        <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Recent Activities</h2></div>
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
                {data.recentWorks.map((work) => (
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
                ))}
              </tbody>
            </table>
          </div>
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
    gray: "bg-gray-50 text-gray-700",
    red: "bg-red-50 text-red-900",
    rose: "bg-rose-50 text-rose-900",
  };
  return (
    <div className={`rounded-lg p-5 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
};

const StatLink = ({ title, value, to, color }) => (
  <Link to={to}>
    <Stat title={title} value={value} color={color} />
  </Link>
);

export default BusinessDashboard;
