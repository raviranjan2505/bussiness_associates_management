import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedAssociateId = new URLSearchParams(location.search).get("associate");
  const selectedAssociateName = location.state?.associateName || "";

  const loadLeads = async (associateId = selectedAssociateId) => {
    try {
      setLoading(true);
      const params = {};
      if (associateId) params.associate = associateId;
      const res = await axiosInstance.get("/leads", { params });
      setLeads(res.data.leads || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [selectedAssociateId]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => {
      const haystack = `${lead.leadId || ""} ${lead.clientDetails?.clientName || ""} ${lead.clientDetails?.mobileNumber || ""} ${lead.clientDetails?.email || ""} ${lead.leadStatus || ""} ${lead.associate?.name || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, search]);

  const { page, totalPages, paged: pagedLeads, resetPage, onPrev, onNext } = usePagination(filteredLeads, 10);
  useEffect(() => { resetPage(); }, [search, selectedAssociateId]);

  return (
    <DashboardLayout activeMenu="New Leads">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedAssociateId ? `Leads for ${selectedAssociateName || "Associate"}` : "New Leads"}</h1>
            <p className="text-sm text-gray-500">
              {selectedAssociateId
                ? `Showing leads submitted by ${selectedAssociateName || "the selected associate"}.`
                : "Review newly submitted leads and view submitted client details."}
            </p>
          </div>
          <div className="text-sm font-medium text-gray-600">Total: {leads.length} leads</div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Search by lead id, client name, mobile, email, associate, or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Lead ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Division / Service</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Loading leads...
                    </td>
                  </tr>
                ) : filteredLeads.length > 0 ? (
                  pagedLeads.map((lead) => (
                    <tr
                      key={lead._id}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/admin/leads/${lead._id}`)}
                    >
                      <td className="p-3 font-medium text-gray-900">{lead.leadId}</td>
                      <td className="p-3 text-gray-600">
                        <div>{lead.clientDetails?.clientName || "-"}</div>
                        <div className="text-xs text-gray-500">{lead.clientDetails?.mobileNumber || "-"}</div>
                      </td>
                      <td className="p-3 text-gray-600">
                        <div>{lead.associate?.name || "-"}</div>
                        <div className="text-xs text-gray-500">{lead.associate?.email || "-"}</div>
                      </td>
                      <td className="p-3 text-gray-600">
                        <div>{lead.division?.name || "-"}</div>
                        <div className="text-xs text-gray-500">{lead.service?.name || "-"}</div>
                      </td>
                      <td className="p-3 text-gray-600">{lead.leadStatus || "-"}</td>
                      <td className="p-3 text-gray-600">{moment(lead.createdAt).format("DD MMM YYYY")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No leads found.
                    </td>
                  </tr>
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

export default Leads;
