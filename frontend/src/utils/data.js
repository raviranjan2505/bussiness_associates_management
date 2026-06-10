import {
  MdDashboardCustomize,
  MdDomain,
  MdLogout,
  MdManageHistory,
  MdNotifications,
  MdOutlineTaskAlt,
  MdPeopleAlt,
} from "react-icons/md";

export const SIDE_MENU_DATA = [
  { id: 1, label: "Dashboard", icon: MdDashboardCustomize, path: "/admin/dashboard" },
  { id: 2, label: "Review Work", icon: MdManageHistory, path: "/admin/works" },
  { id: 3, label: "Divisions & Services", icon: MdDomain, path: "/admin/divisions-services" },
  { id: 4, label: "Associates", icon: MdPeopleAlt, path: "/admin/users" },
  { id: 5, label: "Notifications", icon: MdNotifications, path: "/admin/notifications" },
  { id: 6, label: "Logout", icon: MdLogout, path: "logout" },
];

export const ASSOCIATE_SIDE_MENU_DATA = [
  { id: 1, label: "Dashboard", icon: MdDashboardCustomize, path: "/associate/dashboard" },
  { id: 2, label: "Submit Work", icon: MdOutlineTaskAlt, path: "/associate/submit-work" },
  { id: 3, label: "Track Work", icon: MdOutlineTaskAlt, path: "/associate/works" },
  { id: 4, label: "Notifications", icon: MdNotifications, path: "/associate/notifications" },
  { id: 5, label: "Logout", icon: MdLogout, path: "logout" },
];

export const STATUS_DATA = [
  { label: "Pending", value: "Pending" },
  { label: "Under Review", value: "Under Review" },
  { label: "Documents Required", value: "Documents Required" },
  { label: "In Process", value: "In Process" },
  { label: "Completed", value: "Completed" },
  { label: "Rejected", value: "Rejected" },
];
