import React, { useEffect, useState } from "react";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    axiosInstance.get("/business/notifications").then((res) => setNotifications(res.data.notifications || [])).catch(console.error);
  }, []);

  return (
    <DashboardLayout activeMenu="Notifications">
      <div className="p-6 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <section className="bg-white border border-gray-100 rounded-lg divide-y">
          {notifications.map((note) => (
            <div key={note._id} className={`p-4 ${note.read ? "" : "bg-blue-50"}`}>
              <p className="font-semibold text-gray-900">{note.title}</p>
              <p className="text-sm text-gray-600">{note.message}</p>
              <p className="text-xs text-gray-500 mt-1">{note.type} • {moment(note.createdAt).format("DD MMM YYYY hh:mm A")}</p>
            </div>
          ))}
          {!notifications.length && <p className="p-4 text-sm text-gray-500">No notifications yet.</p>}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
