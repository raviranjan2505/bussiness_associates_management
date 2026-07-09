import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const toClientParam = (clientName, mobileNumber) =>
  `nm_${encodeURIComponent(clientName || "")}_${encodeURIComponent(mobileNumber || "")}`;

const AssociateWorks = () => {
  const { id } = useParams();
  const [associate, setAssociate] = useState(null);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [userRes, groupsRes] = await Promise.all([
        axiosInstance.get(`/users/${id}`),
        axiosInstance.get(`/business/works/by-associate/${id}/grouped`),
      ]);
      setAssociate(userRes.data);
      setClients(groupsRes.data.clients || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to load work groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.clientName} ${c.mobileNumber} ${c.email}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const { page, totalPages, paged: pagedClients, resetPage, onPrev, onNext } = usePagination(filtered, 10);
  useEffect(() => { resetPage(); }, [search]);

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm text-blue-700 font-medium" to="/admin/users">
              ← Back to Associates
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {associate?.name ? `${associate.name} — Work by Client` : "Work by Client"}
            </h1>
            <p className="text-sm text-gray-500">
              Work grouped by client. Click a client to see all their work items.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">{filtered.length} clients</span>
            <Link
              to={`/admin/users/${id}/leads`}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              📋 View Leads Instead
            </Link>
          </div>
        </div>

        {/* Associate info */}
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

        {/* Search */}
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:border-gray-400 focus:outline-none"
            placeholder="Search by client name, mobile or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Client groups table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3 text-center">Total Work</th>
                  <th className="p-3">Latest Status</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading clients…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">
                    {search ? "No clients match your search." : "No work found for this associate."}
                  </td></tr>
                ) : pagedClients.map((client) => {
                  const param = toClientParam(client.clientName, client.mobileNumber);
                  return (
                    <tr key={`${client.clientName}-${client.mobileNumber}`} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <Link
                          to={`/admin/users/${id}/works/${param}`}
                          className="font-medium text-gray-900 hover:text-blue-700"
                        >
                          {client.clientName}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {client.mobileNumber || "No mobile"}{client.email ? ` | ${client.email}` : ""}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 min-w-[28px]">
                          {client.totalWorks}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={client.latestStatus} />
                      </td>
                      <td className="p-3 text-gray-500">
                        {client.latestUpdatedAt ? moment(client.latestUpdatedAt).format("DD MMM YYYY hh:mm A") : "-"}
                      </td>
                      <td className="p-3 text-right">
                        <Link className="text-blue-700 font-medium hover:underline" to={`/admin/users/${id}/works/${param}`}>
                          Open ›
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filtered.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateWorks;