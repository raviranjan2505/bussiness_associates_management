import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const AllClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/business/clients?allClients=true");
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
      `${c.clientName} ${c.mobileNumber} ${c.email} ${c.associate?.name} ${c.associate?.email}`
        .toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <DashboardLayout activeMenu="All Clients">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
            <p className="text-sm text-gray-500">View leads or works for any client.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filtered.length} of {clients.length} clients</span>
            <button onClick={load} disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:border-gray-400 focus:outline-none"
            placeholder="Search by client name, mobile, email or associate…"
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
                  <th className="px-4 py-3">Associate</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-center">View Leads</th>
                  <th className="px-4 py-3 text-center">View Works</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading clients…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">No clients found.</td></tr>
                ) : filtered.map((client) => (
                  <tr key={client._id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{client.clientName}</p>
                      {client.address && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{client.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <p>{client.mobileNumber || "—"}</p>
                      <p className="text-xs text-gray-400">{client.email || ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{client.associate?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{client.associate?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {moment(client.createdAt).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/clients/${client._id}/leads`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        📋 View Leads
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/clients/${client._id}/works`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        🗂️ View Works
                      </button>
                    </td>
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

export default AllClients;