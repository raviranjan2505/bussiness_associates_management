import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (v) => (Number.isFinite(Number(v)) ? `Rs. ${Number(v).toFixed(2)}` : "Rs. 0.00");

const LeadDetails = ({ activeMenu = "New Leads" }) => {
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
      navigate(`/admin/quotations/${lead.quotationId._id || lead.quotationId}`);
      return;
    }

    try {
      setActionLoading(true);
      // POST with no services body — the backend derives them from lead.services[]
      const res = await axiosInstance.post(`/leads/${id}/quotation`, {});
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
      <DashboardLayout activeMenu={activeMenu}>
        <div className="p-6 text-gray-500">Loading lead...</div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout activeMenu={activeMenu}>
        <div className="p-6 text-gray-500">Lead not found.</div>
      </DashboardLayout>
    );
  }

  // Determine whether this is a multi-service lead
  const isMultiService = Array.isArray(lead.services) && lead.services.length > 0;
  const serviceList = isMultiService ? lead.services : null;

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
            <p className="text-sm text-gray-500">Review the submitted lead and status history.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-600">{lead.leadId}</div>
            <div className="flex items-center gap-3 flex-wrap">
              {lead.quotationId && (
                <Link
                  to={`/admin/quotations/${lead.quotationId._id || lead.quotationId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  📋 {lead.quotationId.quotationNumber || "View Quotation"}
                  {lead.quotationId.status && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">{lead.quotationId.status}</span>
                  )}
                </Link>
              )}
              <button
                type="button"
                onClick={handleCreateQuotation}
                disabled={actionLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {lead.quotationId
                  ? "Re-open Quotation"
                  : actionLoading
                  ? "Creating…"
                  : "Create Quotation"}
              </button>
            </div>
          </div>
        </div>

        {/* Client + Lead meta */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Client Info</h2>
            <dl className="mt-3 space-y-1 text-sm text-gray-700">
              <Row label="Name" value={lead.clientDetails?.clientName} />
              <Row label="Mobile" value={lead.clientDetails?.mobileNumber} />
              <Row label="Email" value={lead.clientDetails?.email} />
              <Row label="Address" value={lead.clientDetails?.address} />
            </dl>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Lead Info</h2>
            <dl className="mt-3 space-y-1 text-sm text-gray-700">
              {!isMultiService && (
                <>
                  <Row label="Service" value={lead.service?.name} />
                  <Row label="Division" value={lead.division?.name} />
                </>
              )}
              <Row label="Status" value={lead.leadStatus} />
              <Row label="Submitted" value={moment(lead.createdAt).format("DD MMM YYYY")} />
              {isMultiService && (
                <Row label="Services" value={`${lead.services.length} services`} />
              )}
            </dl>
          </div>
        </section>

        {/* Services table for multi-service leads */}
        {isMultiService && (
          <section className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">
              Services ({serviceList.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Service</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Loan Amount</th>
                    <th className="p-3 text-right">Earning</th>
                    <th className="p-3">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceList.map((svc, i) => (
                    <tr key={svc._id || i} className="border-t">
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 font-medium text-gray-900">{svc.name}</td>
                      <td className="p-3 text-right text-gray-700">{formatMoney(svc.price)}</td>
                      <td className="p-3 text-right text-gray-700">
                        {svc.loanAmount > 0 ? formatMoney(svc.loanAmount) : "—"}
                      </td>
                      <td className="p-3 text-right text-gray-700">{formatMoney(svc.associateEarningAmount)}</td>
                      <td className="p-3 text-gray-600">{svc.documents?.length || 0} file(s)</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={2} className="p-3 text-gray-700">Total</td>
                    <td className="p-3 text-right text-gray-900">
                      {formatMoney(serviceList.reduce((s, x) => s + Number(x.price || 0), 0))}
                    </td>
                    <td className="p-3 text-right text-gray-900">
                      {formatMoney(serviceList.reduce((s, x) => s + Number(x.loanAmount || 0), 0))}
                    </td>
                    <td className="p-3 text-right text-gray-900">
                      {formatMoney(serviceList.reduce((s, x) => s + Number(x.associateEarningAmount || 0), 0))}
                    </td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Single-service pricing (legacy) */}
        {!isMultiService && (lead.servicePrice != null) && (
          <section className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Service Pricing</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-500">Service Price</p>
                <p className="font-medium text-gray-900">{formatMoney(lead.servicePrice)}</p>
              </div>
              {lead.loanAmount > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs uppercase text-gray-500">Loan Amount</p>
                  <p className="font-medium text-gray-900">{formatMoney(lead.loanAmount)}</p>
                </div>
              )}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-500">Associate Earning</p>
                <p className="font-medium text-gray-900">{formatMoney(lead.associateEarningAmount)}</p>
              </div>
            </div>
          </section>
        )}

        {/* Documents (top-level) */}
        {lead.documents?.length > 0 && (
          <section className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="mb-3 font-semibold text-gray-900">
              Documents ({lead.documents.length})
            </h2>
            <div className="space-y-2">
              {lead.documents.map((doc, i) => (
                <a
                  key={doc._id || i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-700 hover:underline"
                >
                  📄 {doc.originalName || doc.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Status History */}
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
                    <div className="text-xs text-gray-500">
                      {moment(item.updatedAt).format("DD MMM YYYY, h:mm A")}
                    </div>
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

const Row = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="w-24 shrink-0 text-gray-500">{label}:</span>
    <span className="font-medium text-gray-900">{value || "—"}</span>
  </div>
);

export default LeadDetails;