import React, { useEffect, useState } from "react";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const PRIORITY_STYLE = {
  High:   "bg-red-50 text-red-700 border-red-100",
  Medium: "bg-yellow-50 text-yellow-700 border-yellow-100",
  Low:    "bg-green-50 text-green-700 border-green-100",
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get("/announcements", { params: { isActive: "true" } })
      .then((res) => setAnnouncements(res.data.announcements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout activeMenu="Announcements">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500">Announcements from your admin team.</p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : announcements.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white p-8 text-center text-gray-400">
            No announcements at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div
                key={a._id}
                className={`rounded-xl border p-5 ${PRIORITY_STYLE[a.priority] || "bg-white border-gray-100"}`}
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{a.title}</h2>
                    {a.description && (
                      <p className="mt-0.5 text-sm text-gray-600">{a.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[a.priority] || ""}`}>
                      {a.priority}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {moment(a.createdAt).format("DD MMM YYYY")}
                    </span>
                  </div>
                </div>
                {a.content && (
                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-line border-t border-current/10 pt-3">
                    {a.content}
                  </p>
                )}
                {a.expiryDate && (
                  <p className="mt-2 text-xs text-gray-400">
                    Expires: {moment(a.expiryDate).format("DD MMM YYYY")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Announcements;