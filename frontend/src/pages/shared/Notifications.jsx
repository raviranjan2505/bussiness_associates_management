import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { resolveNotificationLink } from "../../utils/notificationLink";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <DashboardLayout activeMenu="Notifications">
      <div className="p-6 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
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
                  className={`p-4 ${note.read ? "" : "bg-blue-50"} ${
                    clickable ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-gray-900">{note.title}</p>
                    {!note.read && (
                      <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-words">{note.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
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