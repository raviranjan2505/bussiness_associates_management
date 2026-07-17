import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { MdClose } from "react-icons/md";
import {
  FileText, RefreshCw, FileClock, UploadCloud, CheckCircle2, XCircle,
  UserPlus, IndianRupee, Send, Receipt, PlayCircle, AlertCircle,
  MessageSquareText, Bell,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { resolveNotificationLink } from "../../utils/notificationLink";

// One color + icon per notification type, grouped by what it means for the
// reader — green/emerald for good news, red/rose for rejections, amber for
// "needs your attention", blue/indigo for routine updates, purple for
// something that was sent/shared. Falls back to a neutral gray bell for any
// type not listed here, so a future type never renders broken.
const TYPE_META = {
  "Work Submitted":          { icon: FileText,          color: "blue" },
  "Status Updated":          { icon: RefreshCw,          color: "indigo" },
  "Documents Requested":     { icon: FileClock,          color: "amber" },
  "Documents Uploaded":      { icon: UploadCloud,        color: "emerald" },
  "Work Completed":          { icon: CheckCircle2,       color: "green" },
  "Work Rejected":           { icon: XCircle,            color: "red" },
  "Lead Submitted":          { icon: UserPlus,           color: "blue" },
  "Quotation Created":       { icon: FileText,           color: "purple" },
  "Payment Recorded":        { icon: IndianRupee,        color: "emerald" },
  "Quotation Sent":          { icon: Send,               color: "purple" },
  "Quotation Accepted":      { icon: CheckCircle2,       color: "green" },
  "Quotation Rejected":      { icon: XCircle,            color: "red" },
  "Invoice Generated":       { icon: Receipt,            color: "blue" },
  "Payment Updated":         { icon: IndianRupee,        color: "emerald" },
  "Work Started":            { icon: PlayCircle,         color: "indigo" },
  "Work Status Changed":     { icon: RefreshCw,          color: "indigo" },
  "Complaint Created":       { icon: AlertCircle,        color: "amber" },
  "Complaint Replied":       { icon: MessageSquareText,  color: "blue" },
  "Complaint Resolved":      { icon: CheckCircle2,       color: "green" },
  "Invoice Cancelled":       { icon: XCircle,            color: "rose" },
  "Quotation Sent To Client":{ icon: Send,               color: "purple" },
  "Invoice Sent To Client":  { icon: Send,               color: "purple" },
};
const DEFAULT_META = { icon: Bell, color: "gray" };

const TYPE_COLORS = {
  blue:    { icon: "bg-blue-50 text-blue-600",       badge: "bg-blue-50 text-blue-700" },
  indigo:  { icon: "bg-indigo-50 text-indigo-600",   badge: "bg-indigo-50 text-indigo-700" },
  amber:   { icon: "bg-amber-50 text-amber-600",     badge: "bg-amber-50 text-amber-700" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700" },
  green:   { icon: "bg-green-50 text-green-600",     badge: "bg-green-50 text-green-700" },
  purple:  { icon: "bg-purple-50 text-purple-600",   badge: "bg-purple-50 text-purple-700" },
  rose:    { icon: "bg-rose-50 text-rose-600",       badge: "bg-rose-50 text-rose-700" },
  red:     { icon: "bg-red-50 text-red-600",         badge: "bg-red-50 text-red-700" },
  gray:    { icon: "bg-gray-100 text-gray-500",      badge: "bg-gray-100 text-gray-600" },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    axiosInstance
      .get("/business/notifications")
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpen = async (note) => {
    // Mark as read (existing API — unchanged), then hand off to whichever
    // page the notification relates to.
    if (!note.read) {
      try {
        await axiosInstance.patch(`/business/notifications/${note._id}/read`);
        setNotifications((prev) => prev.map((n) => (n._id === note._id ? { ...n, read: true } : n)));
        // Let the navbar bell know its unread count is now stale.
        window.dispatchEvent(new Event("notifications:updated"));
      } catch (error) {
        console.error(error);
      }
    }

    const link = resolveNotificationLink(note, currentUser?.role);
    if (link) navigate(link);
  };

  // Admin and associates can both clear a notification once they've read it —
  // the row's own click (handleOpen) is stopped from firing so this doesn't
  // also navigate away.
  const handleDelete = async (e, note) => {
    e.stopPropagation();
    setDeletingId(note._id);
    try {
      await axiosInstance.delete(`/business/notifications/${note._id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== note._id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout activeMenu="Notifications">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stay on top of updates across your work, leads, quotations, and payments.</p>
        </div>

        <section className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100 shadow-sm overflow-hidden">
          {loading && <p className="p-4 text-sm text-gray-500">Loading…</p>}
          {!loading &&
            notifications.map((note) => {
              const clickable = !!resolveNotificationLink(note, currentUser?.role);
              const { icon: Icon, color } = TYPE_META[note.type] || DEFAULT_META;
              const c = TYPE_COLORS[color];
              return (
                <div
                  key={note._id}
                  onClick={() => handleOpen(note)}
                  role={clickable ? "button" : undefined}
                  className={`group relative flex gap-3 p-3 sm:p-4 transition-colors ${
                    note.read ? "bg-white" : "bg-blue-50/50"
                  } ${clickable ? "cursor-pointer hover:bg-gray-50" : ""}`}
                >
                  {/* Unread accent bar */}
                  {!note.read && <span className="absolute left-0 top-0 h-full w-1 bg-blue-600" aria-hidden="true" />}

                  {/* Type icon */}
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full ${c.icon}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.25} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{note.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!note.read && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />
                        )}
                        {note.read && (
                          <button
                            onClick={(e) => handleDelete(e, note)}
                            disabled={deletingId === note._id}
                            aria-label="Delete notification"
                            className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            <MdClose className="text-lg" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 break-words mt-0.5">{note.message}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.badge}`}>
                        {note.type}
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-400">
                        {moment(note.createdAt).format("DD MMM YYYY")} · {moment(note.createdAt).format("hh:mm A")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          {!loading && !notifications.length && (
            <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;