import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const fmt = (v) => (Number.isFinite(Number(v)) ? `Rs. ${Number(v).toFixed(2)}` : "Rs. 0.00");

const StatusBadge = ({ status }) => {
  const map = {
    Submitted: "bg-blue-50 text-blue-700",
    "Seen By Admin": "bg-purple-50 text-purple-700",
    "In Progress": "bg-yellow-50 text-yellow-700",
    "Waiting For Payment": "bg-orange-50 text-orange-700",
    Completed: "bg-green-50 text-green-700",
    Rejected: "bg-red-50 text-red-700",
    Cancelled: "bg-gray-50 text-gray-600",
  };
  const cls = map[status] || "bg-gray-50 text-gray-600";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex gap-2 text-sm">
    <span className="w-28 shrink-0 text-gray-500">{label}:</span>
    <span className="min-w-0 flex-1 break-words font-medium text-gray-900">{value || "—"}</span>
  </div>
);

const Card = ({ title, children, action }) => (
  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const AssociateLeadDetails = () => {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/leads/${id}`);
        setLead(res.data.lead || null);
      } catch (e) {
        toast.error(e.response?.data?.message || "Unable to load lead details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout activeMenu="My Leads">
        <div className="flex items-center justify-center p-12 text-gray-400">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout activeMenu="My Leads">
        <div className="p-6 text-gray-500">Lead not found.</div>
      </DashboardLayout>
    );
  }

  const isMultiService = Array.isArray(lead.services) && lead.services.length > 0;
  const quotation = lead.quotationId;
  const invoice = lead.invoiceId;
  const totalServices = isMultiService ? lead.services.length : 1;
  const totalPrice = isMultiService
    ? lead.services.reduce((s, x) => s + Number(x.price || 0), 0)
    : Number(lead.servicePrice || 0);
  const totalEarning = isMultiService
    ? lead.services.reduce((s, x) => s + Number(x.associateEarningAmount || 0), 0)
    : Number(lead.associateEarningAmount || 0);

  return (
    <DashboardLayout activeMenu="My Leads">
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/associate/leads"
                className="text-sm text-gray-400 hover:text-gray-700"
              >
                ← My Leads
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-700">{lead.leadId}</span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
              {isMultiService ? `${totalServices} Services` : (lead.service?.name || lead.title || "Lead")}
            </h1>
            <p className="text-sm text-gray-500">
              {lead.clientDetails?.clientName} · Submitted {moment(lead.createdAt).format("DD MMM YYYY")}{" "}
              <span className="text-xs text-gray-400">{moment(lead.createdAt).format("hh:mm A")}</span>
            </p>
          </div>
          <StatusBadge status={lead.leadStatus} />
        </div>

        {/* ── Quick links: Quotation & Invoice ── */}
        {(quotation || invoice) && (
          <div className="flex flex-wrap gap-3">
            {quotation && (
              <Link
                to={`/associate/quotations/${quotation._id || quotation}`}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                📋 Quotation {quotation.quotationNumber}
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">{quotation.status}</span>
              </Link>
            )}
            {invoice && (
              <Link
                to={`/associate/invoices/${invoice._id || invoice}`}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                🧾 Invoice {invoice.invoiceNumber}
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs">{invoice.invoiceStatus}</span>
                {invoice.balanceDue > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Due {fmt(invoice.balanceDue)}
                  </span>
                )}
              </Link>
            )}
          </div>
        )}

        {/* ── Client + Lead meta ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Client Information">
            <div className="space-y-2">
              <InfoRow label="Name" value={lead.clientDetails?.clientName} />
              <InfoRow label="Mobile" value={lead.clientDetails?.mobileNumber} />
              <InfoRow label="Email" value={lead.clientDetails?.email} />
              <InfoRow label="Address" value={lead.clientDetails?.address} />
            </div>
          </Card>

          <Card title="Lead Information">
            <div className="space-y-2">
              <InfoRow label="Lead ID" value={lead.leadId} />
              <InfoRow label="Status" value={lead.leadStatus} />
              <InfoRow label="Priority" value={lead.priority} />
              {!isMultiService && (
                <>
                  <InfoRow label="Division" value={lead.division?.name} />
                  <InfoRow label="Service" value={lead.service?.name} />
                </>
              )}
              {isMultiService && (
                <InfoRow label="Services" value={`${totalServices} services`} />
              )}
              <InfoRow label="Submitted" value={moment(lead.createdAt).format("DD MMM YYYY, h:mm A")} />
            </div>
          </Card>
        </div>

        {/* ── Services table (multi-service) ── */}
        {isMultiService && (
          <Card title={`Services (${totalServices})`}>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">Loan Amount</th>
                    <th className="px-5 py-3 text-right">Your Earning</th>
                    <th className="px-5 py-3">Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.services.map((svc, i) => (
                    <tr key={svc._id || i} className="border-t">
                      <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{svc.name}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{fmt(svc.price)}</td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {svc.loanAmount > 0 ? fmt(svc.loanAmount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-green-700">{fmt(svc.associateEarningAmount)}</td>
                      <td className="px-5 py-3 text-gray-500">{svc.documents?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={2} className="px-5 py-3 text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right text-gray-900">{fmt(totalPrice)}</td>
                    <td className="px-5 py-3 text-right text-gray-900">
                      {fmt(lead.services.reduce((s, x) => s + Number(x.loanAmount || 0), 0))}
                    </td>
                    <td className="px-5 py-3 text-right text-green-700">{fmt(totalEarning)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

        {/* ── Single-service pricing ── */}
        {!isMultiService && lead.servicePrice != null && (
          <Card title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Service Price</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{fmt(lead.servicePrice)}</p>
              </div>
              {lead.loanAmount > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Loan Amount</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{fmt(lead.loanAmount)}</p>
                </div>
              )}
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs uppercase tracking-wide text-green-600">Your Commission</p>
                <p className="mt-1 text-lg font-bold text-green-700">{fmt(lead.associateEarningAmount)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Documents ── */}
        {lead.documents?.length > 0 && (
          <Card title={`Documents (${lead.documents.length})`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {lead.documents.map((doc, i) => (
                <a
                  key={doc._id || i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-sm text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <span className="text-lg">📄</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.originalName || doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.category || "Document"}</p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* ── Status History ── */}
        <Card title="Status History">
          {lead.statusHistory?.length ? (
            <ol className="relative border-l border-gray-200 space-y-5 ml-2">
              {[...lead.statusHistory].reverse().map((item, i) => (
                <li key={item._id || i} className="pl-6">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 ring-4 ring-white" />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.newStatus}</p>
                      {item.reason && <p className="text-xs text-gray-500">{item.reason}</p>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {moment(item.updatedAt || item.createdAt).format("DD MMM YYYY, h:mm A")}
                    </span>
                  </div>
                  {item.remark && (
                    <p className="mt-1 text-sm text-gray-600 rounded bg-gray-50 px-3 py-2">{item.remark}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No status history yet.</p>
          )}
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default AssociateLeadDetails;