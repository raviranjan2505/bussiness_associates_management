import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const isObjectId = (s) => /^[a-f\d]{24}$/i.test(s);

const StatusPill = ({ status }) => {
  const map = {
    Pending: "bg-gray-50 text-gray-600",
    "Under Review": "bg-blue-50 text-blue-700",
    "Documents Required": "bg-yellow-50 text-yellow-700",
    "In Process": "bg-purple-50 text-purple-700",
    "Waiting For Payment": "bg-orange-50 text-orange-700",
    Completed: "bg-green-50 text-green-700",
    Rejected: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || "bg-gray-50 text-gray-500"}`}>
      {status || "—"}
    </span>
  );
};

const ClientWorksList = () => {
  const { clientId } = useParams();
  const { currentUser } = useSelector((s) => s.user);
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === "admin";
  const base = isAdmin ? "/admin" : "/associate";

  const [works, setWorks] = useState([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        setLoading(true);
        const raw = decodeURIComponent(clientId);
        let params = {};

        if (isObjectId(raw)) {
          // Filter strictly by the selected client's Mongo _id — the backend
          // resolves this to that exact client's records only, so no other
          // client's work can ever show up here.
          params = { clientId: raw };
          // Best-effort fetch of the client's name for the page header.
          try {
            const clientRes = await axiosInstance.get(`/business/clients/${raw}`);
            const name = clientRes.data?.client?.clientName || "";
            if (name) setClientName(name);
          } catch {
            // ignore — name will be derived from the work results below if any
          }
        } else if (raw.startsWith("nm_")) {
          const parts = raw.slice(3).split("_");
          const name = decodeURIComponent(parts[0] || "");
          const mobile = decodeURIComponent(parts[1] || "");
          params = { clientName: name, ...(mobile ? { mobileNumber: mobile } : {}) };
        } else {
          params = { clientName: raw.split("|")[1] || "" };
        }

        const res = await axiosInstance.get("/business/works", { params });
        const data = res.data.works || [];
        setWorks(data);
        if (data[0]) setClientName(data[0].clientDetails?.clientName || "Client");
        else if (!clientName) {
          // Try to get name from leads if no works
          try {
            const lRes = await axiosInstance.get("/leads", { params: isObjectId(raw) ? { clientId: raw } : { search: Object.values(params)[0] } });
            const l = lRes.data.leads?.[0];
            if (l) setClientName(l.clientDetails?.clientName || "Client");
          } catch { /* ignore */ }
        }
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load works");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const { page, totalPages, paged: pagedWorks, resetPage, onPrev, onNext } = usePagination(works, 10);
  useEffect(() => { resetPage(); }, [clientId]);

  return (
    <DashboardLayout activeMenu={isAdmin ? "All Clients" : "My Clients"}>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate(`${base}/clients`)}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ← {isAdmin ? "All Clients" : "My Clients"}
            </button>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {clientName ? `${clientName} — Works` : "Client Works"}
            </h1>
            <p className="text-sm text-gray-500">{works.length} work{works.length !== 1 ? "s" : ""} found</p>
          </div>
          {/* Quick switch to Leads */}
          <button
            onClick={() => navigate(`${base}/clients/${clientId}/leads`)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📋 View Leads Instead
          </button>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Work ID</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Division</th>
                  {isAdmin && <th className="px-4 py-3">Associate</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-gray-400">Loading works…</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-gray-400">No works found for this client.</td></tr>
                ) : pagedWorks.map((work) => (
                  <tr
                    key={work._id}
                    onClick={() => navigate(`${base}/work/${work._id}`)}
                    className="border-t cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{work.workId || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{work.clientDetails?.clientName || "—"}</p>
                      <p className="text-xs text-gray-400">{work.clientDetails?.mobileNumber || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{work.service?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{work.division?.name || "—"}</td>
                    {isAdmin && <td className="px-4 py-3 text-gray-600">{work.associate?.name || "—"}</td>}
                    <td className="px-4 py-3"><StatusPill status={work.status} /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{moment(work.createdAt).format("DD MMM YYYY")}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{moment(work.updatedAt).format("DD MMM YYYY")}</td>
                    <td className="px-4 py-3 text-gray-400 text-right">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={works.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ClientWorksList;