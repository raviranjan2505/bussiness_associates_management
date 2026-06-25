import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadLead = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/leads/${id}`);
      setLead(res.data.lead || null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to load lead details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (!lead) return;
    if (lead.quotationId) {
      navigate(`/admin/quotations/${lead.quotationId._id}`);
      return;
    }

    const servicePrice = lead.servicePrice || lead.service?.price || 0;
    const serviceLine = {
      service: lead.service?._id,
      name: lead.service?.name || "Lead service",
      description: `Lead ${lead.leadId}`,
      price: servicePrice,
      quantity: 1,
      amount: servicePrice,
      associateEarningPercent: lead.associateEarningPercent || 0,
      associateEarningAmount: lead.associateEarningAmount || 0,
    };

    try {
      setActionLoading(true);
      const res = await axiosInstance.post(`/leads/${id}/quotation`, {
        services: [serviceLine],
        notes: lead.remarks || undefined,
        terms: lead.terms || undefined,
        validUntil: undefined,
      });
      toast.success("Quotation created for lead");
      navigate(`/admin/quotations/${res.data.quotation._id}`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create quotation");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout activeMenu="New Leads">
        <div className="p-6 text-gray-500">Loading lead...</div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout activeMenu="New Leads">
        <div className="p-6 text-gray-500">Lead not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="New Leads">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
            <p className="text-sm text-gray-500">Review the submitted lead and status history.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-600">{lead.leadId}</div>
            <button
              type="button"
              onClick={handleCreateQuotation}
              disabled={actionLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {lead.quotationId ? "View Quotation" : actionLoading ? "Creating…" : "Create Quotation"}
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Client Info</h2>
            <p className="mt-3 text-sm text-gray-700">Name: {lead.clientDetails?.clientName || "-"}</p>
            <p className="text-sm text-gray-700">Mobile: {lead.clientDetails?.mobileNumber || "-"}</p>
            <p className="text-sm text-gray-700">Email: {lead.clientDetails?.email || "-"}</p>
            <p className="text-sm text-gray-700">Address: {lead.clientDetails?.address || "-"}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Lead Info</h2>
            <p className="mt-3 text-sm text-gray-700">Service: {lead.service?.name || "-"}</p>
            <p className="text-sm text-gray-700">Division: {lead.division?.name || "-"}</p>
            <p className="text-sm text-gray-700">Status: {lead.leadStatus || "-"}</p>
            <p className="text-sm text-gray-700">Submitted: {moment(lead.createdAt).format("DD MMM YYYY")}</p>
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Status History</h2>
          <div className="mt-3 space-y-3">
            {lead.statusHistory?.length ? (
              lead.statusHistory.map((item) => (
                <div key={item._id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.newStatus}</p>
                      <p className="text-xs text-gray-500">{item.reason || "Status updated"}</p>
                    </div>
                    <div className="text-xs text-gray-500">{moment(item.updatedAt).format("DD MMM YYYY, h:mm A")}</div>
                  </div>
                  {item.remark && <p className="mt-2 text-sm text-gray-700">{item.remark}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No status history available.</p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default LeadDetails;
