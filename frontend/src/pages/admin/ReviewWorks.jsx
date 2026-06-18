import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { buildClientRoute } from "../../utils/clientWork";

const ReviewWorks = ({ activeMenu = "Client List" }) => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await axiosInstance.get("/business/clients");
    setClients(res.data.clients || []);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      const haystack = `${client.clientName || ""} ${client.mobileNumber || ""} ${client.email || ""} ${client.associateName || ""} ${client.workIds?.join(" ") || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search]);

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client List</h1>
            <p className="text-sm text-gray-500">
              View clients from every associate and open the full work history from All Services.
            </p>
          </div>
          <button onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
            Refresh
          </button>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Search by client name, mobile, email, associate, or work id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Works</th>
                  <th className="p-3">All Services</th>
                  <th className="p-3">Latest Status</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.clientKey} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{client.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {client.mobileNumber || "-"}
                        {client.email ? ` | ${client.email}` : ""}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-gray-900">{client.associateName || "-"}</p>
                      <p className="text-xs text-gray-500">{client.associateEmail || ""}</p>
                    </td>
                    <td className="p-3 font-medium text-gray-900">{client.worksCount || 0}</td>
                    <td className="p-3">
                      <Link className="font-medium text-blue-700" to={buildClientRoute("admin", client.clientKey)}>
                        All Services ({client.services?.length || 0})
                      </Link>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={client.latestStatus || "Pending"} />
                    </td>
                    <td className="p-3 text-gray-600">
                      {client.latestUpdatedAt ? moment(client.latestUpdatedAt).format("DD MMM YYYY hh:mm A") : "-"}
                    </td>
                    <td className="p-3">
                      <Link className="font-medium text-blue-700" to={buildClientRoute("admin", client.clientKey)}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!filteredClients.length && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={7}>
                      No clients found.
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

export default ReviewWorks;
