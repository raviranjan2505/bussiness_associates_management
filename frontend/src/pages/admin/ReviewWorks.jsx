import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { STATUS_DATA } from "../../utils/data";
import { buildClientRoute } from "../../utils/clientWork";

const ReviewWorks = ({
  activeMenu = "Client List",
  pageTitle = "Client List",
  pageDescription = "View clients from every associate and open the full work history from All Services.",
}) => {
  const [clients, setClients] = useState([]);
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("projectStatus") || params.get("status") || "");

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
      const matchesSearch = haystack.includes(q);
      const matchesStatus = !status || String(client.latestStatus || "") === String(status);
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, status]);

  const { page, totalPages, paged: pagedClients, resetPage, onPrev, onNext } = usePagination(filteredClients, 10);
  useEffect(() => { resetPage(); }, [search, status]);

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{pageDescription}</p>
          </div>
          <button onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
            Refresh
          </button>
        </div>

        <div className="grid gap-3 rounded-lg border border-gray-100 bg-white p-4 md:grid-cols-[1fr_260px]">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Search by client name, mobile, email, associate, or work id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border p-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Work Statuses</option>
            {STATUS_DATA.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
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
                {pagedClients.map((client) => (
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
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filteredClients.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ReviewWorks;
