import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import AddAttachmentsInput from "../../components/AddAttachmentsInput";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import WorkTimeline from "../../components/WorkTimeline";
import axiosInstance from "../../utils/axioInstance";

// ── Constants ────────────────────────────────────────────────────────────────
const WORK_STATUSES = [
  "Pending",
  "Under Review",
  "Documents Required",
  "In Process",
  "Completed",
  "Rejected",
];

const fmt = (v) =>
  `Rs. ${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const InfoBox = ({ label, children, value, mono }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{label}</p>
    {children ?? (
      <p className={`text-sm font-medium text-gray-900 break-all ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    )}
  </div>
);

const Card = ({ title, children, action }) => (
  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const WorkDetails = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const isAdmin = currentUser?.role === "admin";
  const basePath = isAdmin ? "/admin" : "/associate";

  const [work, setWork]       = useState(null);
  const [invoice, setInvoice] = useState(null); // fetched separately for services & invoiceNumber

  // Admin: status update form
  const [statusForm, setStatusForm] = useState({
    status: "Pending",
    reason: "",
    remark: "",
    requestedDocuments: "",
    expectedCompletionDate: "",
  });
  const [completedFiles, setCompletedFiles] = useState([]);
  const [statusSaving, setStatusSaving]     = useState(false);

  // Associate: document upload
  const [files, setFiles]       = useState([]);
  const [docSaving, setDocSaving] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadWork = async () => {
    const res = await axiosInstance.get(`/business/works/${id}`);
    const w = res.data;
    setWork(w);
    setStatusForm((f) => ({ ...f, status: w.status || "Pending" }));
    return w;
  };

  const loadInvoice = async (w) => {
    // invoiceId is a raw ObjectId (not populated by getWork)
    const invId = typeof w.invoiceId === "object" ? w.invoiceId?._id : w.invoiceId;
    if (!invId) return;
    try {
      const res = await axiosInstance.get(`/invoices/${invId}`);
      setInvoice(res.data);
    } catch {
      // invoice not accessible or doesn't exist — silently skip
    }
  };

  const reload = async () => {
    try {
      const w = await loadWork();
      await loadInvoice(w);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load work details");
    }
  };

  useEffect(() => { reload(); }, [id]);

  // ── Status update (admin only) ────────────────────────────────────────────
  const updateStatus = async (e) => {
    e.preventDefault();
    setStatusSaving(true);
    try {
      const payload = new FormData();
      payload.append("status", statusForm.status);
      payload.append("reason", statusForm.reason);
      payload.append("remark", statusForm.remark);
      payload.append(
        "requestedDocuments",
        JSON.stringify(
          statusForm.requestedDocuments
            .split(",").map((x) => x.trim()).filter(Boolean)
        )
      );
      payload.append("expectedCompletionDate", statusForm.expectedCompletionDate);
      if (statusForm.status === "Completed") {
        completedFiles.forEach((f) => payload.append("documents", f));
      }
      await axiosInstance.post(`/business/works/${id}/status`, payload);
      toast.success("Status updated");
      setCompletedFiles([]);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  // ── Document upload (associate only) ─────────────────────────────────────
  const uploadDocs = async (e) => {
    e.preventDefault();
    if (!files.length) return toast.error("Select at least one file");
    setDocSaving(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("documents", f));
      await axiosInstance.post(`/business/works/${id}/documents`, form);
      setFiles([]);
      toast.success("Documents uploaded");
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to upload");
    } finally {
      setDocSaving(false);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!work)
    return (
      <DashboardLayout activeMenu="Work Details">
        <div className="p-6 flex items-center justify-center h-64 text-gray-400 text-sm">
          Loading…
        </div>
      </DashboardLayout>
    );

  // Resolved invoice refs
  const rawInvoiceId =
    typeof work.invoiceId === "object" ? work.invoiceId?._id : work.invoiceId;
  const invoiceDisplayNumber = invoice?.invoiceNumber || null;

  // Invoice services — the individual breakdown we want to show
  const invoiceServices = invoice?.services || [];

  // Totals from invoice
  const totalAmount    = invoice?.totalAmount    ?? null;
  const amountPaid     = invoice?.amountPaid     ?? null;
  const balanceDue     = invoice?.balanceDue     ?? null;

  return (
    <DashboardLayout activeMenu={isAdmin ? "Review Work" : "Track Work"}>
      <div className="p-6 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              to={`${basePath}/works`}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back to Works
            </Link>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">{work.workId}</h1>
            <p className="text-sm text-gray-500">
              {work.clientDetails?.clientName} · {work.division?.name} · {work.service?.name}
            </p>
          </div>
          <StatusBadge status={work.status} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* ════════════════════════════════════════════════════
              LEFT — Main content
          ════════════════════════════════════════════════════ */}
          <div className="xl:col-span-2 space-y-6">

            {/* ── Client Details ───────────────────────────────── */}
            <Card title="Client Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoBox label="Client Name"  value={work.clientDetails?.clientName} />
                <InfoBox label="Mobile"       value={work.clientDetails?.mobileNumber} />
                <InfoBox label="Email"        value={work.clientDetails?.email} />
                <InfoBox label="Address"      value={work.clientDetails?.address} />
                {isAdmin && (
                  <InfoBox label="Associate" value={work.associate?.name} />
                )}
                <InfoBox label="Submitted"    value={moment(work.createdAt).format("DD MMM YYYY hh:mm A")} />
                <InfoBox label="Last Updated" value={moment(work.updatedAt).format("DD MMM YYYY hh:mm A")} />
              </div>
            </Card>

            {/* ── Invoice & Services ───────────────────────────── */}
            <Card
              title="Services"
              action={
                invoiceDisplayNumber && rawInvoiceId ? (
                  <Link
                    to={`${basePath}/invoices/${rawInvoiceId}`}
                    className="text-sm font-semibold text-blue-700 hover:underline font-mono"
                  >
                    {invoiceDisplayNumber}
                  </Link>
                ) : rawInvoiceId ? (
                  <span className="text-xs text-gray-400 font-mono">{rawInvoiceId}</span>
                ) : null
              }
            >
              {invoiceServices.length > 0 ? (
                <>
                  {/* Individual service rows */}
                  <div className="overflow-x-auto -mx-5 -mt-2">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-xs text-white uppercase tracking-wide">
                        <tr>
                          <th className="px-5 py-3">#</th>
                          <th className="px-5 py-3">Service Name</th>
                          <th className="px-5 py-3">Description</th>
                          <th className="px-5 py-3 text-right">Price</th>
                          <th className="px-5 py-3 text-right">Qty</th>
                          <th className="px-5 py-3 text-right">Amount</th>
                          <th className="px-5 py-3 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceServices.map((svc, i) => (
                          <tr
                            key={svc._id || i}
                            className={`border-t border-gray-100 ${
                              // highlight the row that matches this work's service
                              svc.service && String(svc.service) === String(work.service?._id)
                                ? "bg-blue-50"
                                : ""
                            }`}
                          >
                            <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3 font-medium text-gray-900">{svc.name}</td>
                            <td className="px-5 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                              {svc.description || "—"}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-700 whitespace-nowrap">
                              {fmt(svc.price)}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-700">{svc.quantity}</td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {fmt(svc.amount)}
                            </td>
                            <td className="px-5 py-3 text-right text-emerald-700 font-medium whitespace-nowrap">
                              {fmt(svc.associateEarningAmount)}
                              {svc.loanAmount > 0 && (
                                <div className="text-[11px] text-gray-400 font-normal">
                                  on loan {fmt(svc.loanAmount)}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      {/* Totals footer */}
                      <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm">
                        {invoice?.discount?.amount > 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-2 text-right text-gray-500">Discount</td>
                            <td className="px-5 py-2 text-right text-gray-700">
                              − {fmt(invoice.discount.amount)}
                            </td>
                          </tr>
                        )}
                        {invoice?.tax?.amount > 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-2 text-right text-gray-500">
                              Tax ({invoice.tax.percent}%)
                            </td>
                            <td className="px-5 py-2 text-right text-gray-700">
                              {fmt(invoice.tax.amount)}
                            </td>
                          </tr>
                        )}
                        {totalAmount != null && (
                          <tr>
                            <td colSpan={6} className="px-5 py-2 text-right font-bold text-gray-900">
                              Total
                            </td>
                            <td className="px-5 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                              {fmt(totalAmount)}
                            </td>
                          </tr>
                        )}
                        {amountPaid != null && (
                          <tr>
                            <td colSpan={6} className="px-5 py-2 text-right text-green-700">
                              Amount Paid
                            </td>
                            <td className="px-5 py-2 text-right text-green-700 font-semibold whitespace-nowrap">
                              {fmt(amountPaid)}
                            </td>
                          </tr>
                        )}
                        {balanceDue != null && (
                          <tr>
                            <td colSpan={6} className="px-5 py-2 text-right font-semibold text-red-600">
                              Balance Due
                            </td>
                            <td className="px-5 py-2 text-right font-bold text-red-600 whitespace-nowrap">
                              {fmt(balanceDue)}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>

                  {/* Invoice link below table */}
                  {rawInvoiceId && (
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Invoice:</span>
                      <Link
                        to={`${basePath}/invoices/${rawInvoiceId}`}
                        className="font-mono font-semibold text-blue-700 hover:underline"
                      >
                        {invoiceDisplayNumber || rawInvoiceId}
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                // No invoice yet — show single work service details
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoBox label="Service" value={work.service?.name} />
                  <InfoBox label="Division" value={work.division?.name} />
                  {work.loanAmount > 0 ? (
                    <InfoBox label="Loan Amount" value={fmt(work.loanAmount)} />
                  ) : (
                    <InfoBox
                      label="Service Price"
                      value={fmt(work.servicePrice ?? work.service?.price)}
                    />
                  )}
                  <InfoBox
                    label="Commission"
                    value={fmt(work.associateEarningAmount ?? work.service?.associateEarningAmount)}
                  />
                  {work.associateEarningPercent != null && (
                    <InfoBox label="Commission %" value={`${work.associateEarningPercent}%`} />
                  )}
                  {work.expectedCompletionDate && (
                    <InfoBox
                      label="Expected Completion"
                      value={moment(work.expectedCompletionDate).format("DD MMM YYYY")}
                    />
                  )}
                  {rawInvoiceId && (
                    <InfoBox label="Invoice ID">
                      <Link
                        to={`${basePath}/invoices/${rawInvoiceId}`}
                        className="font-mono text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {invoiceDisplayNumber || rawInvoiceId}
                      </Link>
                    </InfoBox>
                  )}
                </div>
              )}
            </Card>

            {/* ── Service Form Data ────────────────────────────── */}
            {Object.keys(work.formData || {}).length > 0 && (
              <Card title="Service Form Data">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(work.formData).map(([k, v]) => (
                    <InfoBox key={k} label={k.replaceAll("_", " ")} value={String(v)} />
                  ))}
                </div>
              </Card>
            )}

            {/* ── Documents ────────────────────────────────────── */}
            <Card title="Documents">
              {work.documents?.length ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {work.documents.map((doc) => (
                    <a
                      key={doc._id}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {(doc.name || "DO").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {doc.category} · v{doc.version}
                          {doc.uploadedAt ? ` · ${moment(doc.uploadedAt).format("DD MMM YYYY")}` : ""}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No documents attached.</p>
              )}
            </Card>

            {/* ── Audit Log ────────────────────────────────────── */}
            {work.auditLogs?.length > 0 && (
              <Card title="Audit Log">
                <div className="space-y-2">
                  {work.auditLogs.map((log) => (
                    <div key={log._id} className="text-sm border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{log.actionType}</p>
                      <p className="text-gray-600 mt-0.5">{log.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {log.userName} ({log.userRole}) ·{" "}
                        {moment(log.createdAt).format("DD MMM YYYY hh:mm A")}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ════════════════════════════════════════════════════
              RIGHT — Sidebar
          ════════════════════════════════════════════════════ */}
          <aside className="space-y-6">

            {/* Status Timeline — visible to everyone */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Status Timeline</h2>
              <WorkTimeline items={work.statusHistory} />
            </div>

            {/* ── ADMIN ONLY: Update Status ─────────────────────── */}
            {isAdmin && (
              <form
                onSubmit={updateStatus}
                className="bg-white border border-gray-100 rounded-xl p-5 space-y-3"
              >
                <h2 className="font-semibold text-gray-900">Update Status</h2>

                {/* Current status pill */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-xs text-gray-400">Current:</span>
                  <StatusBadge status={work.status} />
                </div>

                {/* New status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Status</label>
                  <select
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-500"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  >
                    {WORK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                  <input
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-500"
                    placeholder="Short reason for the change"
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  />
                </div>

                {/* Remark */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remark / Note</label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-500 resize-none"
                    placeholder="Additional instruction or note"
                    value={statusForm.remark}
                    onChange={(e) => setStatusForm({ ...statusForm, remark: e.target.value })}
                  />
                </div>

                {/* Requested docs — only shown when relevant */}
                {statusForm.status === "Documents Required" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Requested Documents{" "}
                      <span className="text-gray-400">(comma separated)</span>
                    </label>
                    <input
                      className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-500"
                      placeholder="e.g. Aadhaar Card, PAN Card"
                      value={statusForm.requestedDocuments}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, requestedDocuments: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* Expected completion */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-gray-500"
                    value={statusForm.expectedCompletionDate}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, expectedCompletionDate: e.target.value })
                    }
                  />
                </div>

                {/* Completed docs — only when marking Completed */}
                {statusForm.status === "Completed" && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-600">Completed Documents</p>
                    <AddAttachmentsInput
                      attachments={completedFiles}
                      setAttachments={setCompletedFiles}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={statusSaving}
                  className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {statusSaving ? "Saving…" : "Save Status"}
                </button>
              </form>
            )}

            {/* ── ASSOCIATE ONLY: Upload Documents ─────────────── */}
            {!isAdmin && (
              <form
                onSubmit={uploadDocs}
                className="bg-white border border-gray-100 rounded-xl p-5 space-y-3"
              >
                <h2 className="font-semibold text-gray-900">Upload Additional Documents</h2>
                <AddAttachmentsInput attachments={files} setAttachments={setFiles} />
                <button
                  type="submit"
                  disabled={docSaving}
                  className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {docSaving ? "Uploading…" : "Upload Documents"}
                </button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WorkDetails;