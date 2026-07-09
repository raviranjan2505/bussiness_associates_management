import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const STATUS_COLORS = {
  Submitted: "bg-blue-50 text-blue-700",
  "Seen By Admin": "bg-purple-50 text-purple-700",
  "In Progress": "bg-yellow-50 text-yellow-700",
  "Waiting For Payment": "bg-orange-50 text-orange-700",
  Completed: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-gray-50 text-gray-500",
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-50 text-gray-500"}`}>
    {status || "—"}
  </span>
);

const MyLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/leads");
      setLeads(res.data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || `${lead.leadId} ${lead.clientDetails?.clientName} ${lead.clientDetails?.mobileNumber} ${lead.clientDetails?.email} ${lead.leadStatus}`.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || lead.leadStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const statuses = useMemo(() => [...new Set(leads.map((l) => l.leadStatus).filter(Boolean))], [leads]);

  const { page, totalPages, paged: pagedLeads, resetPage, onPrev, onNext } = usePagination(filteredLeads, 10);
  useEffect(() => { resetPage(); }, [search, statusFilter]);

  return (
    <DashboardLayout activeMenu="My Leads">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
            <p className="text-sm text-gray-500">Click any lead to view full details and track its status.</p>
          </div>
          <div className="text-sm font-medium text-gray-500">
            {filteredLeads.length} of {leads.length} leads
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm focus:border-gray-400 focus:outline-none"
            placeholder="Search by lead ID, client name, mobile, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-200 p-2.5 text-sm focus:border-gray-400 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quotation</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">Loading leads…</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      {search || statusFilter ? "No leads match your filters." : "No leads yet."}
                    </td>
                  </tr>
                ) : (
                  pagedLeads.map((lead) => {
                    const isMulti = Array.isArray(lead.services) && lead.services.length > 0;
                    const serviceName = isMulti
                      ? `${lead.services.length} Services`
                      : lead.service?.name || lead.title || "—";

                    return (
                      <tr
                        key={lead._id}
                        onClick={() => navigate(`/associate/leads/${lead._id}`)}
                        className="border-t cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                          {lead.leadId}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{lead.clientDetails?.clientName || "—"}</p>
                          <p className="text-xs text-gray-400">{lead.clientDetails?.mobileNumber || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{serviceName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.leadStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {lead.quotationId ? (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {lead.quotationId.quotationNumber || "View"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
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
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filteredLeads.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default MyLeads;