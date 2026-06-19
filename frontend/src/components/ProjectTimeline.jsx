import React from "react";
import moment from "moment";
import StatusBadge from "./StatusBadge";

const ProjectTimeline = ({ items = [] }) => {
  if (!items.length) return <p className="text-sm text-gray-500 py-4">No timeline entries yet.</p>;
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-5 pl-10">
        {items.map((item, i) => (
          <div key={item._id || i} className="relative">
            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge status={item.newStatus} />
                {item.previousStatus && <span className="text-xs text-gray-400">from {item.previousStatus}</span>}
              </div>
              {item.remark && <p className="text-sm text-gray-700 mt-1">{item.remark}</p>}
              <p className="text-xs text-gray-400 mt-2">
                {item.updatedBy?.name || "System"} &bull; {moment(item.timestamp || item.createdAt).format("DD MMM YYYY hh:mm A")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTimeline;
