import {
  MdDashboardCustomize,
  MdDomain,
  MdLogout,
  MdManageHistory,
  MdNotifications,
  MdOutlineTaskAlt,
  MdPeopleAlt,
  MdRequestQuote,
  MdReceiptLong,
  MdPayments,
  MdFolderOpen,
  MdBugReport,
} from "react-icons/md";

// ── Admin side menu ────────────────────────────────────────────────────────
export const SIDE_MENU_DATA = [
  { id: 1,  label: "Dashboard",           icon: MdDashboardCustomize, path: "/admin/dashboard" },
  { id: 2,  label: "Client List",         icon: MdManageHistory,      path: "/admin/clients" },
  { id: 3,  label: "Quotations",          icon: MdRequestQuote,       path: "/admin/quotations" },
  { id: 4,  label: "Invoices",            icon: MdReceiptLong,        path: "/admin/invoices" },
  { id: 5,  label: "Payments",            icon: MdPayments,           path: "/admin/payments" },
  { id: 6,  label: "Projects",            icon: MdFolderOpen,         path: "/admin/projects" },
  { id: 7,  label: "Complaints",          icon: MdBugReport,          path: "/admin/complaints" },
  { id: 8,  label: "Divisions & Services",icon: MdDomain,             path: "/admin/divisions-services" },
  { id: 9,  label: "Associates",          icon: MdPeopleAlt,          path: "/admin/users" },
  { id: 10, label: "Notifications",       icon: MdNotifications,      path: "/admin/notifications" },
  { id: 11, label: "Logout",              icon: MdLogout,             path: "logout" },
];

// ── Associate side menu ───────────────────────────────────────────────────
export const ASSOCIATE_SIDE_MENU_DATA = [
  { id: 1, label: "Dashboard",     icon: MdDashboardCustomize, path: "/associate/dashboard" },
  { id: 2, label: "Submit Work",   icon: MdOutlineTaskAlt,     path: "/associate/submit-work" },
  { id: 3, label: "Client List",    icon: MdManageHistory,      path: "/associate/clients" },
  { id: 4, label: "Quotations",    icon: MdRequestQuote,       path: "/associate/quotations" },
  { id: 5, label: "Invoices",      icon: MdReceiptLong,        path: "/associate/invoices" },
  { id: 6, label: "Payments",      icon: MdPayments,           path: "/associate/payments" },
  { id: 7, label: "Complaints",    icon: MdBugReport,          path: "/associate/complaints" },
  { id: 8, label: "Notifications", icon: MdNotifications,      path: "/associate/notifications" },
  { id: 9, label: "Logout",        icon: MdLogout,             path: "logout" },
];

// ── Work submission statuses ──────────────────────────────────────────────
export const STATUS_DATA = [
  { label: "Pending",            value: "Pending" },
  { label: "Under Review",       value: "Under Review" },
  { label: "Documents Required", value: "Documents Required" },
  { label: "In Process",         value: "In Process" },
  { label: "Completed",          value: "Completed" },
  { label: "Rejected",           value: "Rejected" },
];

// ── Quotation statuses ────────────────────────────────────────────────────
export const QUOTATION_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"];

// ── Invoice statuses ──────────────────────────────────────────────────────
export const INVOICE_STATUSES = [
  "Generated",
  "Waiting For Payment",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
];

// ── Project/Workflow statuses ─────────────────────────────────────────────
export const PROJECT_STATUSES = [
  "Waiting For Payment",
  "Payment Received",
  "Work Assigned",
  "Work Started",
  "In Progress",
  "Review Pending",
  "Client Approval Pending",
  "Completed",
  "On Hold",
  "Cancelled",
];

// ── Complaint statuses ────────────────────────────────────────────────────
export const COMPLAINT_STATUSES = ["Pending", "In Review", "Resolved", "Closed"];

// ── Payment methods ───────────────────────────────────────────────────────
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];
