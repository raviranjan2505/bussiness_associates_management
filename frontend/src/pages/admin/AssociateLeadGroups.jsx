import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

// Build a URL-safe client key from name+mobile (consistent with the rest of the app)
const toClientParam = (clientName, mobileNumber) =>
  `nm_${encodeURIComponent(clientName || "")}_${encodeURIComponent(mobileNumber || "")}`;

const AssociateLeadGroups = () => {
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
        axiosInstance.get(`/leads/by-associate/${id}/grouped`),
      ]);
      setAssociate(userRes.data);
      setClients(groupsRes.data.clients || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to load lead groups");
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
            <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
              {associate?.name ? `${associate.name} — Leads by Client` : "Leads by Client"}
            </h1>
            <p className="text-sm text-gray-500">
              Leads grouped by client. Click a client to see all their leads.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">{filtered.length} clients</span>
            <Link
              to={`/admin/users/${id}/works`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              🗂️ View Work Instead
            </Link>
          </div>
        </div>

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
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center">Total Leads</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading clients…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">
                    {search ? "No clients match your search." : "No leads found for this associate."}
                  </td></tr>
                ) : pagedClients.map((client) => (
                  <tr
                    key={`${client.clientName}-${client.mobileNumber}`}
                    className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/users/${id}/leads/${toClientParam(client.clientName, client.mobileNumber)}`}
                        className="font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {client.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{client.mobileNumber || "—"}</p>
                      <p className="text-xs text-gray-400">{client.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 min-w-[28px]">
                        {client.totalLeads}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {client.latestUpdatedAt ? (
                        <>
                          <div>{moment(client.latestUpdatedAt).format("DD MMM YYYY")}</div>
                          <div className="text-xs text-gray-400">{moment(client.latestUpdatedAt).format("hh:mm A")}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/users/${id}/leads/${toClientParam(client.clientName, client.mobileNumber)}`}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        View Leads ›
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filtered.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssociateLeadGroups;