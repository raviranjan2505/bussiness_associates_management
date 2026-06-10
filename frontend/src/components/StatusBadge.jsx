import React from "react";

const styles = {
  Pending: "bg-amber-100 text-amber-800",
  "Under Review": "bg-sky-100 text-sky-800",
  "Documents Required": "bg-rose-100 text-rose-800",
  "In Process": "bg-indigo-100 text-indigo-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}>
    {status || "Pending"}
  </span>
);

export default StatusBadge;
