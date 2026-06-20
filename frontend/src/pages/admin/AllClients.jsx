import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const AllClients = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/business/clients?allClients=true");
      setClients(res.data.clients || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      const haystack = `${client.clientName || ""} ${client.mobileNumber || ""} ${client.email || ""} ${client.associateName || ""} ${client.associateEmail || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search]);

  return (
    <DashboardLayout activeMenu="All Clients">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
            <p className="text-sm text-gray-500">
              View and manage all clients across all associates.
            </p>
          </div>
          <div className="text-sm font-medium text-gray-600">
            Total: {clients.length} clients
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Search by client name, mobile, email, or associate name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Associated With</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">PAN</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Loading clients...
                    </td>
                  </tr>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <tr key={client._id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{client.clientName}</p>
                      </td>
                      <td className="p-3 text-gray-600">
                        <div>{client.mobileNumber || "-"}</div>
                        <div className="text-xs text-gray-500">{client.email || "-"}</div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{client.associate?.name || "-"}</p>
                        <p className="text-xs text-gray-500">{client.associate?.email || "-"}</p>
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">
                        {client.address || "-"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {client.pan || "-"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {moment(client.createdAt).format("DD MMM YYYY")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
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

export default AllClients;
