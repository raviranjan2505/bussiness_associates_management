import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { buildClientRoute } from "../../utils/clientWork";

const emptyClientForm = { clientName: "", mobileNumber: "", email: "", address: "" };

const MyWorks = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);

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
      const haystack = `${client.clientName || ""} ${client.mobileNumber || ""} ${client.email || ""} ${client.workIds?.join(" ") || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search]);

  const submitClient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.post("/business/clients", clientForm);
      toast.success("Client saved");
      setClientForm(emptyClientForm);
      setShowForm(false);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to save client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Client List">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client List</h1>
            <p className="text-sm text-gray-500">
              Add a client once, then pick them from Submit Work instead of typing details again.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            + Add Client
          </button>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Search by client name, mobile, email, or work id"
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
                  <th className="p-3">Contact</th>
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
                      <p className="text-xs text-gray-500">Client ID: {client.clientId || "From work history"}</p>
                    </td>
                    <td className="p-3 text-gray-600">
                      <div>{client.mobileNumber || "-"}</div>
                      <div>{client.email || "-"}</div>
                    </td>
                    <td className="p-3 font-medium text-gray-900">{client.worksCount || 0}</td>
                    <td className="p-3">
                      <Link className="font-medium text-blue-700" to={buildClientRoute("associate", client.clientKey)}>
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
                      <Link className="font-medium text-blue-700" to={buildClientRoute("associate", client.clientKey)}>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Client</h2>
                <p className="text-sm text-gray-500">Save the client once and reuse them from Submit Work.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitClient} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-lg border p-3"
                placeholder="Client Name"
                value={clientForm.clientName}
                onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                required
              />
              <input
                className="rounded-lg border p-3"
                placeholder="Mobile Number"
                value={clientForm.mobileNumber}
                onChange={(e) => setClientForm({ ...clientForm, mobileNumber: e.target.value })}
              />
              <input
                type="email"
                className="rounded-lg border p-3 md:col-span-2"
                placeholder="Email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
              />
              <textarea
                className="rounded-lg border p-3 md:col-span-2"
                rows="3"
                placeholder="Address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              />
              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyWorks;
