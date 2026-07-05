import React from "react";

const styles = {
  // Work statuses
  Pending:              "bg-amber-100 text-amber-800",
  "Under Review":       "bg-sky-100 text-sky-800",
  "Documents Required": "bg-rose-100 text-rose-800",
  "In Process":         "bg-indigo-100 text-indigo-800",
  Completed:            "bg-emerald-100 text-emerald-800",
  Rejected:             "bg-red-100 text-red-800",
  // Quotation statuses
  Draft:                "bg-gray-100 text-gray-700",
  Sent:                 "bg-blue-100 text-blue-800",
  Accepted:             "bg-green-100 text-green-800",
  Approved:             "bg-emerald-100 text-emerald-800",
  Expired:              "bg-orange-100 text-orange-800",
  // Invoice statuses
  Generated:            "bg-purple-100 text-purple-800",
  "Waiting For Payment":"bg-yellow-100 text-yellow-800",
  "Partially Paid":     "bg-teal-100 text-teal-800",
  Paid:                 "bg-emerald-100 text-emerald-800",
  Overdue:              "bg-red-100 text-red-800",
  Cancelled:            "bg-gray-100 text-gray-600",
  // Project statuses
  "Payment Received":   "bg-cyan-100 text-cyan-800",
  "Work Assigned":      "bg-violet-100 text-violet-800",
  "Work Started":       "bg-indigo-100 text-indigo-800",
  "In Progress":        "bg-blue-100 text-blue-800",
  "Review Pending":     "bg-orange-100 text-orange-800",
  "Client Approval Pending": "bg-amber-100 text-amber-800",
  "On Hold":            "bg-gray-100 text-gray-700",
  // Complaint statuses
  "In Review":          "bg-sky-100 text-sky-800",
  Resolved:             "bg-green-100 text-green-800",
  Closed:               "bg-gray-100 text-gray-600",
  // Payment statuses
  Verified:             "bg-green-100 text-green-800",
  Failed:               "bg-red-100 text-red-800",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      styles[status] || "bg-gray-100 text-gray-700"
    }`}
  >
    {status || "—"}
  </span>
);

export default StatusBadge;