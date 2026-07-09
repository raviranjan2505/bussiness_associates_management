import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const decodeClientParam = (raw) => {
  const decoded = decodeURIComponent(raw || "");
  if (decoded.startsWith("nm_")) {
    const parts = decoded.slice(3).split("_");
    return {
      clientName: decodeURIComponent(parts[0] || ""),
      mobileNumber: decodeURIComponent(parts[1] || ""),
    };
  }
  return { clientName: decoded, mobileNumber: "" };
};

const AssociateClientWorks = () => {
  const { id, clientKey } = useParams();
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !clientKey) return;
    (async () => {
      try {
        setLoading(true);
        const { clientName: name, mobileNumber } = decodeClientParam(clientKey);
        setClientName(name);

        const res = await axiosInstance.get("/business/works", {
          params: {
            associate: id,
            clientName: name,
            ...(mobileNumber ? { mobileNumber } : {}),
          },
        });
        setWorks(res.data.works || []);
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load work");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, clientKey]);

  const { page, totalPages, paged: pagedWorks, resetPage, onPrev, onNext } = usePagination(works, 10);
  useEffect(() => { resetPage(); }, [clientKey]);

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate(`/admin/users/${id}/works`)}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ← Back to Client Groups
            </button>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {clientName ? `${clientName} — Work` : "Client Work"}
            </h1>
            <p className="text-sm text-gray-500">{works.length} work item{works.length !== 1 ? "s" : ""} found</p>
          </div>
          <Link
            to={`/admin/users/${id}/leads`}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📋 View Leads Instead
          </Link>
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading work…</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No work found for this client.</td></tr>
                ) : pagedWorks.map((work) => (
                  <tr
                    key={work._id}
                    onClick={() => navigate(`/admin/work/${work._id}`)}
                    className="border-t cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{work.workId || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{work.clientDetails?.clientName || "—"}</p>
                      <p className="text-xs text-gray-400">{work.clientDetails?.mobileNumber || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{work.service?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{work.division?.name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={work.status} /></td>
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

export default AssociateClientWorks;