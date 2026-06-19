import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { buildClientRoute, groupWorksByClient } from "../../utils/clientWork";

const AssociateWorks = () => {
  const { id } = useParams();
  const [associate, setAssociate] = useState(null);
  const [clients, setClients] = useState([]);

  const load = async () => {
    const [userRes, worksRes] = await Promise.all([
      axiosInstance.get(`/users/${id}`),
      axiosInstance.get("/business/works", { params: { associate: id } }),
    ]);

    setAssociate(userRes.data);
    setClients(groupWorksByClient(worksRes.data.works || [], "associate"));
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
            <div>
              Total clients: <span className="font-semibold text-gray-900">{clients.length}</span>
            </div>
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
                  <th className="p-3">Client</th>
                  <th className="p-3">All Services</th>
                  <th className="p-3">Works</th>
                  <th className="p-3">Latest Status</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.clientKey} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{client.clientName}</div>
                      <div className="text-xs text-gray-500">
                        {client.mobileNumber || "No mobile"}{client.email ? ` | ${client.email}` : ""}
                      </div>
                    </td>
                    <td className="p-3">
                      <Link to={buildClientRoute("admin", client.clientKey)} className="text-blue-700 font-medium">
                        All Services ({client.services.length})
                      </Link>
                    </td>
                    <td className="p-3">{client.works.length}</td>
                    <td className="p-3">
                      <StatusBadge status={client.latestStatus} />
                    </td>
                    <td className="p-3">
                      {client.latestUpdatedAt ? moment(client.latestUpdatedAt).format("DD MMM YYYY hh:mm A") : "-"}
                    </td>
                    <td className="p-3">
                      <Link className="text-blue-700 font-medium" to={buildClientRoute("admin", client.clientKey)}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!clients.length && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={6}>
                      No clients found for this associate.
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
