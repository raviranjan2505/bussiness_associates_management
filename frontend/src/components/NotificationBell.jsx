import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdNotificationsNone } from "react-icons/md";
import axiosInstance from "../utils/axioInstance";

// Polling interval for refreshing the unread count. There's no websocket/
// push layer in this app, so this is the lightweight way to keep the badge
// "automatically" up to date without touching the existing notification APIs.
const POLL_INTERVAL_MS = 20000;

const NotificationBell = () => {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await axiosInstance.get("/business/notifications/unread-count");
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      // Fail silently — the badge just won't update this cycle.
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    // Also refresh immediately whenever a notification is opened/marked
    // read elsewhere in the app (dispatched from the Notifications page).
    window.addEventListener("notifications:updated", fetchUnreadCount);
    // And when the tab regains focus, in case notifications arrived while away.
    window.addEventListener("focus", fetchUnreadCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications:updated", fetchUnreadCount);
      window.removeEventListener("focus", fetchUnreadCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const goToNotifications = () => {
    navigate(currentUser.role === "admin" ? "/admin/notifications" : "/associate/notifications");
  };

  return (
    <button
      onClick={goToNotifications}
      className="relative p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
      aria-label="Notifications"
    >
      <MdNotificationsNone className="text-2xl" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;