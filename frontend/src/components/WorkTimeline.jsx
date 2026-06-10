import React from "react";
import moment from "moment";
import StatusBadge from "./StatusBadge";

const WorkTimeline = ({ items = [] }) => {
  if (!items.length) return <p className="text-sm text-gray-500">No status history yet.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item._id || item.updatedAt} className="border-l-2 border-gray-200 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.newStatus} />
            <span className="text-xs text-gray-500">{moment(item.updatedAt).format("DD MMM YYYY hh:mm A")}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-800">{item.reason || "Status updated"}</p>
          {item.remark && <p className="text-sm text-gray-600">{item.remark}</p>}
          {item.requestedDocuments?.length > 0 && (
            <p className="text-sm text-rose-700">Requested: {item.requestedDocuments.join(", ")}</p>
          )}
          <p className="text-xs text-gray-500">Updated by {item.updatedBy?.name || "System"}</p>
        </div>
      ))}
    </div>
  );
};

export default WorkTimeline;
