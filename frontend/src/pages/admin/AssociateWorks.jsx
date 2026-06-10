import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const AssociateWorks = () => {
  const { id } = useParams();
  const [associate, setAssociate] = useState(null);
  const [works, setWorks] = useState([]);

  const load = async () => {
    const [userRes, worksRes] = await Promise.all([
      axiosInstance.get(`/users/${id}`),
      axiosInstance.get("/business/works", { params: { associate: id } }),
    ]);

    setAssociate(userRes.data);
    setWorks(worksRes.data.works || []);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm text-blue-700 font-medium" to="/admin/users">
              Back to Associates
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{associate?.name || "Associate Details"}</h1>
            <p className="text-sm text-gray-500">{associate?.email}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            <div>Total works: <span className="font-semibold text-gray-900">{works.length}</span></div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Name</p>
            <p className="mt-1 font-medium text-gray-900">{associate?.name || "-"}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Email</p>
            <p className="mt-1 font-medium text-gray-900">{associate?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Role</p>
            <p className="mt-1 font-medium text-gray-900">{associate?.role || "-"}</p>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Work ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Division</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Earning</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work._id} className="border-t">
                    <td className="p-3 font-medium">{work.workId}</td>
                    <td className="p-3">{work.clientDetails?.clientName}</td>
                    <td className="p-3">{work.division?.name}</td>
                    <td className="p-3">{work.service?.name}</td>
                    <td className="p-3">Rs. {formatMoney(work.servicePrice || work.service?.price || 0)}</td>
                    <td className="p-3">Rs. {formatMoney(work.associateEarningAmount || work.service?.associateEarningAmount || 0)}</td>
                    <td className="p-3"><StatusBadge status={work.status} /></td>
                    <td className="p-3">{moment(work.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3">
                      <Link className="text-blue-700 font-medium" to={`/admin/work/${work._id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!works.length && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={9}>
                      No work found for this associate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateWorks;
