import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axioInstance";
import AnnouncementCard from "./AnnouncementCard";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get("/announcements");
        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a._id));

  if (visibleAnnouncements.length === 0) return null;

  // Sort by priority: High > Medium > Low
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const sortedAnnouncements = [...visibleAnnouncements].sort(
    (a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
  );

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">
            📢 Announcements ({visibleAnnouncements.length})
          </h2>
        </div>
        {expanded ? (
          <MdExpandLess className="text-xl text-gray-500" />
        ) : (
          <MdExpandMore className="text-xl text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {sortedAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
              onClose={() => setDismissedIds([...dismissedIds, announcement._id])}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;
