import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const AssociateDashboard = () => {
  const [data, setData] = useState({ statistics: {}, recentWorks: [] });

  useEffect(() => {
    axiosInstance.get("/business/dashboard/associate").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const stats = data.statistics || {};

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Associate Dashboard</h1>
            <p className="text-sm text-gray-500">Track submissions, document requests, and completions.</p>
          </div>
          <Link to="/associate/submit-work" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-center">Submit Work</Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Stat title="My Submitted Work" value={stats.mySubmittedWork || 0} />
          <Stat title="Pending Work" value={stats.Pending || 0} />
          <Stat title="In Process Work" value={stats["In Process"] || 0} />
          <Stat title="Completed Work" value={stats.Completed || 0} />
          <Stat title="Requested Documents" value={stats.requestedDocuments || 0} />
          <Stat
            title="My Income"
            value={`₹${Number(
              stats.totalIncome || 0
            ).toLocaleString("en-IN")}`}
          />
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Recent Activity</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Work ID</th><th className="p-3">Client</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {data.recentWorks.map((work) => (
                <tr key={work._id} className="border-t">
                  <td className="p-3 font-medium">{work.workId}</td>
                  <td className="p-3">{work.clientDetails?.clientName}</td>
                  <td className="p-3">{work.service?.name}</td>
                  <td className="p-3"><StatusBadge status={work.status} /></td>
                  <td className="p-3">{moment(work.updatedAt).format("DD MMM YYYY hh:mm A")}</td>
                  <td className="p-3"><Link className="text-blue-700 font-medium" to={`/associate/work/${work._id}`}>Track</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
};

const Stat = ({ title, value }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default AssociateDashboard;
