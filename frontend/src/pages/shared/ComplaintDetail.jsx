import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUSES } from "../../utils/data";

const ComplaintDetail = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const messagesEndRef = useRef(null);

  const [complaint, setComplaint] = useState(null);
  const [replies, setReplies] = useState([]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [adminUpdate, setAdminUpdate] = useState({ status: "", internalNote: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    const res = await axiosInstance.get(`/complaints/${id}`);
    setComplaint(res.data.complaint);
    setReplies(res.data.replies || []);
  };

  useEffect(() => { load().catch(console.error); }, [id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("message", message);
      files.forEach((f) => fd.append("attachments", f));
      await axiosInstance.post(`/complaints/${id}/reply`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage("");
      setFiles([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.patch(`/complaints/${id}`, adminUpdate);
      toast.success("Complaint updated");
      setAdminUpdate({ status: "", internalNote: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  if (!complaint) return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6">Loading…</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{complaint.complaintNumber}</h1>
            <p className="text-sm text-gray-700 mt-1 font-medium">{complaint.subject}</p>
            <p className="text-xs text-gray-500">{complaint.associate?.name} · {moment(complaint.createdAt).format("DD MMM YYYY hh:mm A")}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Chat Thread */}
          <div className="xl:col-span-2 space-y-4">
            {/* Original complaint */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <img src={complaint.associate?.profileImageUrl || "/images/default_avatar.jpg"}
                  alt="" className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{complaint.associate?.name}</p>
                  <p className="text-xs text-gray-500">{moment(complaint.createdAt).format("DD MMM YYYY hh:mm A")}</p>
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{complaint.description}</p>
              {complaint.attachments?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {complaint.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 hover:underline">
                      📎 {att.originalName || att.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Reply bubbles */}
            <div className="space-y-3 min-h-[100px]">
              {replies.map((r) => {
                const isMe = r.sender?._id === currentUser?._id;
                return (
                  <div key={r._id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <img src={r.sender?.profileImageUrl || "/images/default_avatar.jpg"}
                      alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMe ? "bg-gray-900 text-white rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-tl-none"}`}>
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {r.sender?.name} · {r.senderRole}
                      </p>
                      <p className="text-sm whitespace-pre-line">{r.message}</p>
                      {r.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noreferrer"
                              className={`text-xs rounded px-2 py-1 ${isMe ? "bg-white/20 text-white" : "bg-white text-blue-700 border border-blue-200"}`}>
                              📎 {att.originalName || att.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isMe ? "text-gray-400" : "text-gray-500"}`}>
                        {moment(r.createdAt).format("hh:mm A · DD MMM")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            {complaint.status !== "Closed" && (
              <form onSubmit={sendReply} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <textarea
                  rows={3}
                  className="w-full text-sm border-0 outline-none resize-none"
                  placeholder="Type your reply…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    📎 Attach files
                    <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files))} />
                  </label>
                  {files.length > 0 && <span className="text-xs text-gray-500">{files.length} file(s) selected</span>}
                  <button type="submit" disabled={sending || !message.trim()}
                    className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm disabled:opacity-50">
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">
            {/* Info */}
            <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-gray-900">Details</h2>
              <Info label="Complaint #" value={complaint.complaintNumber} />
              <Info label="Associate"   value={complaint.associate?.name} />
              <Info label="Status"      value={<StatusBadge status={complaint.status} />} />
              <Info label="Raised"      value={moment(complaint.createdAt).format("DD MMM YYYY")} />
              {complaint.resolvedAt && <Info label="Resolved" value={moment(complaint.resolvedAt).format("DD MMM YYYY")} />}
            </section>

            {/* Admin controls */}
            {isAdmin && (
              <form onSubmit={updateStatus} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Admin Controls</h2>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Change Status</label>
                  <select className="w-full border rounded-lg p-2 text-sm" value={adminUpdate.status}
                    onChange={(e) => setAdminUpdate({ ...adminUpdate, status: e.target.value })}>
                    <option value="">— no change —</option>
                    {COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Internal Note (private)</label>
                  <textarea rows={3} className="w-full border rounded-lg p-2 text-sm"
                    placeholder="Only admins can see this…"
                    value={adminUpdate.internalNote}
                    onChange={(e) => setAdminUpdate({ ...adminUpdate, internalNote: e.target.value })} />
                </div>
                <button className="bg-gray-900 text-white rounded-lg px-4 py-2 w-full text-sm">Update</button>
              </form>
            )}

            {/* Internal notes (admin only) */}
            {isAdmin && complaint.internalNotes?.length > 0 && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-yellow-800">Internal Notes</h2>
                {complaint.internalNotes.map((n, i) => (
                  <div key={i} className="text-xs text-yellow-900 border-t border-yellow-200 pt-2">
                    <p className="font-medium">{n.addedBy?.name} · {moment(n.createdAt).format("DD MMM HH:mm")}</p>
                    <p className="mt-1">{n.note}</p>
                  </div>
                ))}
              </section>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="flex justify-between items-center gap-2">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className="font-medium text-gray-900">{value || "—"}</span>
  </div>
);

export default ComplaintDetail;
