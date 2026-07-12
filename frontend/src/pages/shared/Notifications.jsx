import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { MdClose } from "react-icons/md";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { resolveNotificationLink } from "../../utils/notificationLink";

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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
        <section className="bg-white border border-gray-100 rounded-lg divide-y">
          {loading && <p className="p-4 text-sm text-gray-500">Loading…</p>}
          {!loading &&
            notifications.map((note) => {
              const clickable = !!resolveNotificationLink(note, currentUser?.role);
              return (
                <div
                  key={note._id}
                  onClick={() => handleOpen(note)}
                  role={clickable ? "button" : undefined}
                  className={`p-3 sm:p-4 ${note.read ? "" : "bg-blue-50"} ${
                    clickable ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""
                  }`}
                >
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
                  <p className="text-xs sm:text-sm text-gray-600 break-words">{note.message}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                    {note.type} • {moment(note.createdAt).format("DD MMM YYYY hh:mm A")}
                  </p>
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