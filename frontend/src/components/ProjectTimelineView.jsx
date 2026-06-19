import React from "react";
import moment from "moment";
import StatusBadge from "./StatusBadge";

const ProjectTimelineView = ({ items = [] }) => {
  if (!items.length)
    return <p className="text-sm text-gray-400 italic">No timeline entries yet.</p>;

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-3">
      {items.map((entry, idx) => (
        <li key={entry._id || idx} className="ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          </span>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={entry.newStatus} />
            {entry.previousStatus && (
              <span className="text-xs text-gray-400">← {entry.previousStatus}</span>
            )}
            <span className="text-xs text-gray-400">
              {moment(entry.timestamp || entry.createdAt).format("DD MMM YYYY hh:mm A")}
            </span>
          </div>
          {entry.remark && (
            <p className="text-sm text-gray-700 mt-1">{entry.remark}</p>
          )}
          {entry.updatedBy?.name && (
            <p className="text-xs text-gray-400 mt-0.5">
              by {entry.updatedBy.name}
              {entry.updatedBy.role ? ` (${entry.updatedBy.role})` : ""}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
};

export default ProjectTimelineView;
