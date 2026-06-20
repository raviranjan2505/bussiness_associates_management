import React from "react";
import moment from "moment";
import { MdClose } from "react-icons/md";

const AnnouncementCard = ({ announcement, onClose }) => {
  return (
    <div
      className={`bg-white border-l-4 rounded-lg p-4 space-y-2 ${
        announcement.priority === "High"
          ? "border-l-red-500 bg-red-50"
          : announcement.priority === "Medium"
          ? "border-l-yellow-500 bg-yellow-50"
          : "border-l-green-500 bg-green-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900">{announcement.title}</h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                announcement.priority === "High"
                  ? "bg-red-200 text-red-700"
                  : announcement.priority === "Medium"
                  ? "bg-yellow-200 text-yellow-700"
                  : "bg-green-200 text-green-700"
              }`}
            >
              {announcement.priority}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{announcement.description}</p>
          {announcement.content && (
            <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">
              {announcement.content}
            </p>
          )}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Posted: {moment(announcement.createdAt).format("DD MMM YYYY, hh:mm A")}</p>
            {announcement.expiryDate && (
              <p>Expires: {moment(announcement.expiryDate).format("DD MMM YYYY")}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <MdClose className="text-lg" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCard;
