import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import { useSelector } from "react-redux";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { groupWorksByClient } from "../../utils/clientWork";

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return value || "";
  }
};

const ClientWorks = () => {
  const { clientKey } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const scope = currentUser?.role === "admin" ? "admin" : "associate";
  const basePath = currentUser?.role === "admin" ? "/admin" : "/associate";
  const decodedKey = useMemo(() => safeDecode(clientKey), [clientKey]);

  const load = async () => {
    setLoading(true);
    const res = await axiosInstance.get("/business/works");
    const grouped = groupWorksByClient(res.data.works || [], scope);
    const match = grouped.find((group) => group.clientKey === decodedKey);
    setWorks(match?.works || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser?.role || !clientKey) return;
    load().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [clientKey, currentUser?.role]);

  const client = useMemo(() => {
    if (!works.length) return null;
    const [first] = groupWorksByClient(works, scope);
    return first || null;
  }, [scope, works]);

  const serviceNames = useMemo(() => {
    if (!client?.works?.length) return [];
    return Array.from(new Set(client.works.map((work) => work.service?.name).filter(Boolean)));
  }, [client]);

  return (
    <DashboardLayout activeMenu="Client List">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm font-medium text-blue-700 hover:underline" to={`${basePath}/clients`}>
              Back to client list
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{client?.clientName || "Client work history"}</h1>
            <p className="text-sm text-gray-500">
              {client?.mobileNumber || "-"}
              {client?.email ? ` | ${client.email}` : ""}
              {client?.address ? ` | ${client.address}` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            <div>
              Total works: <span className="font-semibold text-gray-900">{works.length}</span>
            </div>
            <div className="mt-1">
              All services: <span className="font-semibold text-gray-900">{serviceNames.length}</span>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Client" value={client?.clientName || "-"} />
          <SummaryCard label="Latest Status" value={client?.latestStatus || "-"} />
          <SummaryCard label="Latest Work" value={client?.latestWorkId || "-"} />
        </section>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-gray-900">Work History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3">Work ID</th>
                  <th className="p-3">Service</th>
                  {scope === "admin" && <th className="p-3">Associate</th>}
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={scope === "admin" ? 7 : 6}>
                      Loading client works...
                    </td>
                  </tr>
                )}
                {!loading &&
                  works.map((work) => (
                    <tr key={work._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{work.workId}</td>
                      <td className="p-3">{work.service?.name}</td>
                      {scope === "admin" && <td className="p-3">{work.associate?.name}</td>}
                      <td className="p-3">
                        <StatusBadge status={work.status} />
                      </td>
                      <td className="p-3">{moment(work.createdAt).format("DD MMM YYYY")}</td>
                      <td className="p-3">{moment(work.updatedAt).format("DD MMM YYYY hh:mm A")}</td>
                      <td className="p-3">
                        <Link className="text-blue-700 font-medium" to={`${basePath}/work/${work._id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                {!loading && !works.length && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={scope === "admin" ? 7 : 6}>
                      No work found for this client.
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

const SummaryCard = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="mt-1 font-medium text-gray-900">{value}</p>
  </div>
);

export default ClientWorks;
