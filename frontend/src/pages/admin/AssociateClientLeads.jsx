import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const StatusPill = ({ status }) => {
  const map = {
    Submitted: "bg-blue-50 text-blue-700",
    "Seen By Admin": "bg-purple-50 text-purple-700",
    "In Progress": "bg-yellow-50 text-yellow-700",
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

// Decode the "nm_<encodedName>_<encodedMobile>" client param
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

const AssociateClientLeads = () => {
  const { id, clientKey } = useParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !clientKey) return;
    (async () => {
      try {
        setLoading(true);
        const { clientName: name } = decodeClientParam(clientKey);
        setClientName(name);

        const res = await axiosInstance.get("/leads", {
          params: { associate: id, search: name },
        });
        setLeads(res.data.leads || []);
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load leads");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, clientKey]);

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate(`/admin/users/${id}/leads`)}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ← Back to Client Groups
            </button>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {clientName ? `${clientName} — Leads` : "Client Leads"}
            </h1>
            <p className="text-sm text-gray-500">{leads.length} lead{leads.length !== 1 ? "s" : ""} found</p>
          </div>
          <Link
            to={`/admin/users/${id}/works`}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            🗂️ View Work Instead
          </Link>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service(s)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quotation</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading leads…</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No leads found for this client.</td></tr>
                ) : leads.map((lead) => {
                  const isMulti = Array.isArray(lead.services) && lead.services.length > 0;
                  const svcName = isMulti ? `${lead.services.length} Services` : lead.service?.name || lead.title || "—";
                  const qId = lead.quotationId?._id || lead.quotationId;
                  const qNum = lead.quotationId?.quotationNumber;
                  const invId = lead.invoiceId?._id || lead.invoiceId;
                  const invNum = lead.invoiceId?.invoiceNumber;
                  return (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`/admin/leads/${lead._id}`)}
                      className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{lead.leadId}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.clientDetails?.clientName || "—"}</p>
                        <p className="text-xs text-gray-400">{lead.clientDetails?.mobileNumber || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{svcName}</td>
                      <td className="px-4 py-3"><StatusPill status={lead.leadStatus} /></td>
                      <td className="px-4 py-3">
                        {qId ? (
                          <Link to={`/admin/quotations/${qId}`} onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-blue-700 hover:underline font-mono">
                            {qNum || "View"}
                          </Link>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {invId ? (
                          <Link to={`/admin/invoices/${invId}`} onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-emerald-700 hover:underline font-mono">
                            {invNum || "View"}
                          </Link>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {moment(lead.createdAt).format("DD MMM YYYY")}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-right">›</td>
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

export default AssociateClientLeads;