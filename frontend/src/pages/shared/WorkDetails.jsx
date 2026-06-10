import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import AddAttachmentsInput from "../../components/AddAttachmentsInput";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import WorkTimeline from "../../components/WorkTimeline";
import axiosInstance from "../../utils/axioInstance";

const formatMoney = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00");

const WorkDetails = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const [work, setWork] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: "Under Review",
    reason: "",
    remark: "",
    requestedDocuments: "",
    expectedCompletionDate: "",
  });
  const [completedFiles, setCompletedFiles] = useState([]);
  const [files, setFiles] = useState([]);

  const isAdmin = currentUser?.role === "admin";

  const load = async () => {
    const res = await axiosInstance.get(`/business/works/${id}`);
    setWork(res.data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  const updateStatus = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("status", statusForm.status);
    payload.append("reason", statusForm.reason);
    payload.append("remark", statusForm.remark);
    payload.append(
      "requestedDocuments",
      JSON.stringify(
        statusForm.requestedDocuments
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
    payload.append("expectedCompletionDate", statusForm.expectedCompletionDate);
    if (statusForm.status === "Completed") {
      completedFiles.forEach((file) => payload.append("documents", file));
    }
    await axiosInstance.post(`/business/works/${id}/status`, payload);
    toast.success("Status updated");
    setCompletedFiles([]);
    load();
  };

  const uploadDocs = async (e) => {
    e.preventDefault();
    const form = new FormData();
    files.forEach((file) => form.append("documents", file));
    await axiosInstance.post(`/business/works/${id}/documents`, form);
    setFiles([]);
    toast.success("Documents uploaded");
    load();
  };

  if (!work) {
    return (
      <DashboardLayout activeMenu="Work Details">
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu={isAdmin ? "Review Work" : "Track Work"}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{work.workId}</h1>
            <p className="text-sm text-gray-500">
              {work.clientDetails?.clientName} - {work.division?.name} - {work.service?.name}
            </p>
          </div>
          <StatusBadge status={work.status} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 bg-white border border-gray-100 rounded-lg p-5 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">Client Details</h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Client Name" value={work.clientDetails?.clientName} />
                <Info label="Mobile" value={work.clientDetails?.mobileNumber} />
                <Info label="Email" value={work.clientDetails?.email} />
                <Info label="Address" value={work.clientDetails?.address} />
                <Info label="Service Price" value={`Rs. ${formatMoney(work.servicePrice || work.service?.price || 0)}`} />
                <Info
                  label="Associate Earning"
                  value={`Rs. ${formatMoney(work.associateEarningAmount || work.service?.associateEarningAmount || 0)}`}
                />
                <Info label="Submitted" value={moment(work.createdAt).format("DD MMM YYYY hh:mm A")} />
                <Info label="Last Updated" value={moment(work.updatedAt).format("DD MMM YYYY hh:mm A")} />
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">Service Form Data</h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(work.formData || {}).map(([key, value]) => (
                  <Info key={key} label={key.replaceAll("_", " ")} value={String(value)} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">Documents</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {work.documents?.map((doc) => (
                  <a
                    key={doc._id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {doc.category} - Version {doc.version}
                    </p>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">Audit Log</h2>
              <div className="mt-3 space-y-2">
                {work.auditLogs?.map((log) => (
                  <div key={log._id} className="text-sm border rounded-lg p-3">
                    <p className="font-medium">{log.actionType}</p>
                    <p className="text-gray-600">{log.description}</p>
                    <p className="text-xs text-gray-500">
                      {log.userName} ({log.userRole}) - {moment(log.createdAt).format("DD MMM YYYY hh:mm A")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Status Timeline</h2>
              <WorkTimeline items={work.statusHistory} />
            </section>

            {isAdmin ? (
              <form onSubmit={updateStatus} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Update Status</h2>
                <select
                  className="w-full border rounded-lg p-2"
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                >
                  {["Pending", "Under Review", "Documents Required", "In Process", "Completed", "Rejected"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <input
                  className="w-full border rounded-lg p-2"
                  placeholder="Reason"
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                />
                <textarea
                  className="w-full border rounded-lg p-2"
                  placeholder="Remark or instruction"
                  value={statusForm.remark}
                  onChange={(e) => setStatusForm({ ...statusForm, remark: e.target.value })}
                />
                <input
                  className="w-full border rounded-lg p-2"
                  placeholder="Requested documents, comma separated"
                  value={statusForm.requestedDocuments}
                  onChange={(e) => setStatusForm({ ...statusForm, requestedDocuments: e.target.value })}
                />
                <input
                  type="date"
                  className="w-full border rounded-lg p-2"
                  value={statusForm.expectedCompletionDate}
                  onChange={(e) => setStatusForm({ ...statusForm, expectedCompletionDate: e.target.value })}
                />
                {statusForm.status === "Completed" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Completed documents</p>
                    <AddAttachmentsInput attachments={completedFiles} setAttachments={setCompletedFiles} />
                  </div>
                )}
                <button className="bg-gray-900 text-white rounded-lg px-4 py-2 w-full">Save Status</button>
              </form>
            ) : (
              <form onSubmit={uploadDocs} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Upload Additional Documents</h2>
                <AddAttachmentsInput attachments={files} setAttachments={setFiles} />
                <button className="bg-gray-900 text-white rounded-lg px-4 py-2 w-full">Upload Documents</button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value || "-"}</p>
  </div>
);

export default WorkDetails;
