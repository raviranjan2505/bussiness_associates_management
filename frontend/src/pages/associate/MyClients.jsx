import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const MyClients = () => {
  const navigate = useNavigate();
  const { currentUser } = useSelector((s) => s.user);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/business/clients");
      setClients(res.data.clients || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.clientName} ${c.mobileNumber} ${c.email} ${c.address}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Build the URL param for sub-pages
  const toParam = (client) => {
    if (client.clientId && client.clientId !== "null") return client.clientId;
    return `nm_${encodeURIComponent(client.clientName || "")}_${encodeURIComponent(client.mobileNumber || "")}`;
  };

  // Determine if this associate owns a grouped client
  // The grouped response includes `clientId` (MongoDB _id) when a Client doc exists
  const canEdit = (client) => Boolean(client.clientId);

  const handleDelete = async (clientId, clientName) => {
    if (!window.confirm(`Delete client "${clientName}"? This cannot be undone.`)) return;
    setDeletingId(clientId);
    try {
      await axiosInstance.delete(`/business/clients/${clientId}`);
      toast.success("Client deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout activeMenu="Client List">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
            <p className="text-sm text-gray-500">View leads or works for any client.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filtered.length} of {clients.length} clients</span>
            <button onClick={load} disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link to="/associate/clients/add"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              + Add Client
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:border-gray-400 focus:outline-none"
            placeholder="Search by client name, mobile, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3 text-center">View Leads</th>
                  <th className="px-4 py-3 text-center">View Works</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading clients…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                    {search ? "No clients match your search." : "No clients yet. Add one or submit a work."}
                  </td></tr>
                ) : filtered.map((client) => {
                  const ownedClient = canEdit(client);
                  return (
                    <tr key={client.clientKey || client.clientId} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{client.clientName}</p>
                        {client.pan && <p className="text-xs text-gray-400">PAN: {client.pan}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <p>{client.mobileNumber || "—"}</p>
                        <p className="text-xs text-gray-400">{client.email || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          client.clientType === "Business"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {client.clientType || "Individual"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {client.latestUpdatedAt ? moment(client.latestUpdatedAt).format("DD MMM YYYY") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/associate/clients/${toParam(client)}/leads`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                          📋 View Leads
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/associate/clients/${toParam(client)}/works`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                          🗂️ View Works
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ownedClient ? (
                          <div className="flex items-center justify-center gap-3">
                            <Link
                              to={`/associate/clients/${client.clientId}/edit`}
                              className="text-xs font-medium text-blue-700 hover:underline">
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(client.clientId, client.clientName)}
                              disabled={deletingId === client.clientId}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                              {deletingId === client.clientId ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default MyClients;