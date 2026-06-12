import React, { useEffect, useState } from "react";
import moment from "moment";
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

  const stats = data.statistics || {};
  const pieData = statusKeys.map((status) => ({ status, count: stats[status] || 0 }));

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Associate Dashboard</h1>
          <p className="text-sm text-gray-500">{moment().format("dddd, DD MMMM YYYY")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Stat title="Total Associates" value={stats.totalAssociates || 0} />
          <Stat title="Total Work Requests" value={stats.totalWorkRequests || 0} />
          <Stat title="Pending Works" value={stats.Pending || 0} />
          <Stat title="Completed Works" value={stats.Completed || 0} />
          <Stat
            title="Total Income"
            value={`₹${(stats.totalIncome || 0).toLocaleString()}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="bg-white p-5 rounded-lg border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Status Distribution</h2>
            <div className="h-64"><CustomPieChart data={pieData} colors={["#f59e0b", "#0ea5e9", "#e11d48", "#4f46e5", "#10b981", "#dc2626"]} /></div>
          </section>
          <section className="bg-white p-5 rounded-lg border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Division-wise Statistics</h2>
            <div className="h-64"><CustomBarChart data={data.byDivision.map((x) => ({ priority: x.name, count: x.count }))} /></div>
          </section>
        </div>

        <section className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Recent Activities</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr><th className="p-3">Work ID</th><th className="p-3">Client</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Updated</th></tr>
              </thead>
              <tbody>
                {data.recentWorks.map((work) => (
                  <tr key={work._id} className="border-t">
                    <td className="p-3 font-medium">{work.workId}</td>
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

const Stat = ({ title, value }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-5">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export default BusinessDashboard;
