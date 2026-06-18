import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { COMPLAINT_STATUSES } from "../../utils/data";

const ComplaintDetails = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const isAdmin = currentUser?.role === "admin";
  const [data, setData] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [statusForm, setStatusForm] = useState({ status: "", internalNote: "" });
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const res = await axiosInstance.get(`/complaints/${id}`);
      setData(res.data);
      setStatusForm((s) => ({ ...s, status: res.data.complaint?.status || "Pending" }));
    } catch { toast.error("Failed to load complaint"); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.replies]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    try {
      await axiosInstance.post(`/complaints/${id}/replies`, { message: replyMsg });
      setReplyMsg("");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.patch(`/complaints/${id}/status`, statusForm);
      toast.success("Status updated");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  if (!data) return <DashboardLayout activeMenu="Complaints"><div className="p-6">Loading...</div></DashboardLayout>;

  const { complaint, replies = [] } = data;
  const backPath = isAdmin ? "/admin/complaints" : "/associate/complaints";
  const backLabel = isAdmin ? "← Back to Complaints" : "← My Complaints";

  return (
    <DashboardLayout activeMenu="Complaints">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to={backPath} className="text-sm text-blue-700">{backLabel}</Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{complaint.complaintNumber}</h1>
            <p className="text-sm text-gray-500">{complaint.subject}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chat Thread */}
          <div className="xl:col-span-2 space-y-4">
            {/* Original complaint */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <img src={complaint.associate?.profileImageUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} className="w-8 h-8 rounded-full" alt="" />
                <span className="font-medium text-sm">{complaint.associate?.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{moment(complaint.createdAt).format("DD MMM YYYY hh:mm A")}</span>
              </div>
              <p className="text-sm text-gray-800">{complaint.description}</p>
              {complaint.attachments?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {complaint.attachments.map((a) => (
                    <a key={a._id} href={a.url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">{a.name}</a>
                  ))}
                </div>
              )}
            </div>

            {/* Replies */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {replies.map((r) => {
                const isOwn = r.senderRole === (isAdmin ? "admin" : "associate");
                return (
                  <div key={r._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 text-sm ${isOwn ? "bg-gray-900 text-white" : "bg-white border border-gray-100"}`}>
                      <p className="font-medium text-xs mb-1 opacity-70">{r.sender?.name} • {r.senderRole}</p>
                      <p>{r.message}</p>
                      {r.attachments?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.attachments.map((a) => <a key={a._id} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline opacity-80">{a.name}</a>)}</div>}
                      <p className="text-xs opacity-50 mt-1">{moment(r.createdAt).format("DD MMM hh:mm A")}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {!["Closed", "Resolved"].includes(complaint.status) && (
              <form onSubmit={handleReply} className="flex gap-2 mt-2">
                <input
                  className="flex-1 border rounded-lg p-3 text-sm"
                  placeholder="Type your reply..."
                  value={replyMsg}
                  onChange={(e) => setReplyMsg(e.target.value)}
                />
                <button type="submit" className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm">Send</button>
              </form>
            )}
          </div>

          {/* Sidebar: Admin controls */}
          <aside className="space-y-4">
            <section className="bg-white border border-gray-100 rounded-lg p-5 text-sm space-y-2">
              <h2 className="font-semibold text-gray-900">Complaint Info</h2>
              <p><span className="text-gray-500">Raised by:</span> {complaint.associate?.name}</p>
              <p><span className="text-gray-500">Date:</span> {moment(complaint.createdAt).format("DD MMM YYYY")}</p>
              <p><span className="text-gray-500">Status:</span> <StatusBadge status={complaint.status} /></p>
              {complaint.resolvedAt && <p><span className="text-gray-500">Resolved:</span> {moment(complaint.resolvedAt).format("DD MMM YYYY")}</p>}
            </section>

            {isAdmin && (
              <form onSubmit={handleStatusUpdate} className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
                <h2 className="font-semibold text-gray-900">Update Status</h2>
                <select className="w-full border rounded-lg p-2 text-sm" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  {COMPLAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <textarea className="w-full border rounded-lg p-2 text-sm" rows={3} placeholder="Internal note (optional)" value={statusForm.internalNote} onChange={(e) => setStatusForm({ ...statusForm, internalNote: e.target.value })} />
                <button type="submit" className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm">Update</button>
              </form>
            )}

            {isAdmin && complaint.internalNotes?.length > 0 && (
              <section className="bg-amber-50 border border-amber-100 rounded-lg p-5 text-sm space-y-2">
                <h2 className="font-semibold text-gray-900">Internal Notes</h2>
                {complaint.internalNotes.map((n) => (
                  <div key={n._id} className="border-l-2 border-amber-300 pl-3">
                    <p>{n.note}</p>
                    <p className="text-xs text-gray-500">{moment(n.createdAt).format("DD MMM YYYY")}</p>
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

export default ComplaintDetails;
