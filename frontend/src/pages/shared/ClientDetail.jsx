import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => (Number.isFinite(Number(v)) ? `Rs. ${Number(v).toFixed(2)}` : "—");

const StatusPill = ({ status }) => {
  const map = {
    Submitted: "bg-blue-50 text-blue-700",
    "Seen By Admin": "bg-purple-50 text-purple-700",
    "In Progress": "bg-yellow-50 text-yellow-700",
    "Waiting For Payment": "bg-orange-50 text-orange-700",
    Completed: "bg-green-50 text-green-700",
    Rejected: "bg-red-50 text-red-700",
    Accepted: "bg-green-50 text-green-700",
    Draft: "bg-gray-50 text-gray-600",
    Sent: "bg-blue-50 text-blue-700",
  };
  const cls = map[status] || "bg-gray-50 text-gray-500";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status || "—"}</span>;
};

const ClientDetail = () => {
  const { clientId } = useParams();
  const { currentUser } = useSelector((s) => s.user);
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === "admin";
  const base = isAdmin ? "/admin" : "/associate";

  const [client, setClient] = useState(null);
  const [leads, setLeads] = useState([]);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("leads");

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        setLoading(true);
        const decodedId = decodeURIComponent(clientId);

        // Load leads for this client
        const leadsRes = await axiosInstance.get("/leads", {
          params: isAdmin ? { clientId: decodedId } : { clientId: decodedId },
        });
        const clientLeads = leadsRes.data.leads || [];
        setLeads(clientLeads);

        // Derive client info from leads first
        const firstLead = clientLeads[0];
        const cd = firstLead?.clientDetails || {};

        // Load works using clientName + mobileNumber as identifiers
        let clientWorks = [];
        if (cd.clientName) {
          try {
            const worksRes = await axiosInstance.get("/business/works", {
              params: {
                clientName: cd.clientName,
                ...(cd.mobileNumber ? { mobileNumber: cd.mobileNumber } : {}),
              },
            });
            clientWorks = worksRes.data.works || [];
          } catch { /* no works is fine */ }
        }
        setWorks(clientWorks);

        const firstWork = clientWorks[0];
        const wcd = firstWork?.clientDetails || {};
        setClient({
          clientName: cd.clientName || wcd.clientName || "Client",
          mobileNumber: cd.mobileNumber || wcd.mobileNumber || "",
          email: cd.email || wcd.email || "",
          address: cd.address || wcd.address || "",
          associate: firstLead?.associate || firstWork?.associate,
        });
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load client details");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, isAdmin]);

  if (loading) {
    return (
      <DashboardLayout activeMenu={isAdmin ? "All Clients" : "My Clients"}>
        <div className="flex items-center justify-center p-12 text-gray-400">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu={isAdmin ? "All Clients" : "My Clients"}>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              onClick={() => navigate(`${base}/clients`)}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ← {isAdmin ? "All Clients" : "My Clients"}
            </button>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{client?.clientName || "Client"}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
              {client?.mobileNumber && <span>📞 {client.mobileNumber}</span>}
              {client?.email && <span>✉️ {client.email}</span>}
              {client?.address && <span>📍 {client.address}</span>}
            </div>
            {isAdmin && client?.associate && (
              <p className="mt-1 text-sm text-gray-500">
                Associate: <span className="font-medium text-gray-700">{client.associate.name || client.associate}</span>
              </p>
            )}
          </div>

          {/* Summary counters */}
          <div className="flex gap-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{leads.length}</p>
              <p className="text-xs text-blue-600 font-medium">Leads</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-5 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{works.length}</p>
              <p className="text-xs text-emerald-600 font-medium">Works</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1 w-fit">
          {["leads", "works"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "leads" ? `Leads (${leads.length})` : `Works (${works.length})`}
            </button>
          ))}
        </div>

        {/* ── Leads tab ── */}
        {tab === "leads" && (
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Lead ID</th>
                    <th className="px-4 py-3">Service(s)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Quotation</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-gray-400">No leads found for this client.</td></tr>
                  ) : (
                    leads.map((lead) => {
                      const isMulti = Array.isArray(lead.services) && lead.services.length > 0;
                      const svcName = isMulti
                        ? `${lead.services.length} Services`
                        : lead.service?.name || lead.title || "—";
                      const qId = lead.quotationId?._id || lead.quotationId;
                      const invId = lead.invoiceId?._id || lead.invoiceId;
                      return (
                        <tr
                          key={lead._id}
                          onClick={() => navigate(`${base}/leads/${lead._id}`)}
                          className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{lead.leadId}</td>
                          <td className="px-4 py-3 text-gray-700">{svcName}</td>
                          <td className="px-4 py-3"><StatusPill status={lead.leadStatus} /></td>
                          <td className="px-4 py-3">
                            {qId ? (
                              <Link
                                to={`${base}/quotations/${qId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-blue-700 hover:underline"
                              >
                                {lead.quotationId?.quotationNumber || "View"}
                              </Link>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {invId ? (
                              <Link
                                to={`${base}/invoices/${invId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-emerald-700 hover:underline"
                              >
                                {lead.invoiceId?.invoiceNumber || "View"}
                              </Link>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {moment(lead.createdAt).format("DD MMM YYYY")}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-right">›</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Works tab ── */}
        {tab === "works" && (
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Work ID</th>
                    <th className="px-4 py-3">Service</th>
                    {isAdmin && <th className="px-4 py-3">Associate</th>}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {works.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-gray-400">No works found for this client.</td></tr>
                  ) : (
                    works.map((work) => (
                      <tr
                        key={work._id}
                        onClick={() => navigate(`${base}/work/${work._id}`)}
                        className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{work.workId}</td>
                        <td className="px-4 py-3 text-gray-700">{work.service?.name || "—"}</td>
                        {isAdmin && <td className="px-4 py-3 text-gray-600">{work.associate?.name || "—"}</td>}
                        <td className="px-4 py-3"><StatusPill status={work.status} /></td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{moment(work.createdAt).format("DD MMM YYYY")}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{moment(work.updatedAt).format("DD MMM YYYY")}</td>
                        <td className="px-4 py-3 text-gray-400 text-right">›</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDetail;