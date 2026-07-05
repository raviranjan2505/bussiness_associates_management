import {
  MdDashboardCustomize,
  MdDomain,
  MdPeopleAlt,
  MdManageHistory,
  MdCampaign,
  MdRequestQuote,
  MdReceiptLong,
  MdPayments,
  MdFolderOpen,
  MdBugReport,
  MdNotifications,
  MdLogout,
  MdOutlineTaskAlt,
  MdCurrencyRupee,
} from "react-icons/md";

// ── Admin side menu ────────────────────────────────────────────────────────
export const SIDE_MENU_DATA = [
  { id: 1,  label: "Dashboard",           icon: MdDashboardCustomize, path: "/admin/dashboard" },
  { id: 2,  label: "Divisions & Services",icon: MdDomain,             path: "/admin/divisions-services" },
  { id: 3,  label: "Associates",          icon: MdPeopleAlt,          path: "/admin/users" },
  { id: 4,  label: "Client List",         icon: MdManageHistory,      path: "/admin/clients" },
  { id: 5,  label: "New Leads",           icon: MdCampaign,           path: "/admin/leads" },
  { id: 6,  label: "Quotations",          icon: MdRequestQuote,       path: "/admin/quotations" },
  { id: 7,  label: "Invoices",            icon: MdReceiptLong,        path: "/admin/invoices" },
  { id: 8,  label: "Payments",            icon: MdPayments,           path: "/admin/payments" },
  { id: 9,  label: "Income",              icon: MdCurrencyRupee,      path: "/admin/income" },
  { id: 10, label: "Work",                icon: MdFolderOpen,         path: "/admin/projects" },
  { id: 11, label: "Announcements",       icon: MdCampaign,           path: "/admin/announcements" },
  { id: 12, label: "Notifications",       icon: MdNotifications,      path: "/admin/notifications" },
  { id: 13, label: "Complaints",          icon: MdBugReport,          path: "/admin/complaints" },
  { id: 14, label: "Logout",              icon: MdLogout,             path: "logout" },
];

// ── Associate side menu ───────────────────────────────────────────────────
export const ASSOCIATE_SIDE_MENU_DATA = [
  { id: 1,  label: "Dashboard",     icon: MdDashboardCustomize, path: "/associate/dashboard" },
  { id: 2,  label: "Client List",   icon: MdManageHistory,      path: "/associate/clients" },
  { id: 3,  label: "My Leads",      icon: MdCampaign,           path: "/associate/leads" },
  { id: 4,  label: "Quotations",    icon: MdRequestQuote,       path: "/associate/quotations" },
  { id: 5,  label: "Invoices",      icon: MdReceiptLong,        path: "/associate/invoices" },
  { id: 6,  label: "Payments",      icon: MdPayments,           path: "/associate/payments" },
  { id: 7,  label: "Income",        icon: MdCurrencyRupee,      path: "/associate/income" },
  { id: 8,  label: "Works",         icon: MdFolderOpen,         path: "/associate/works" },
  { id: 9,  label: "Submit Work",   icon: MdOutlineTaskAlt,     path: "/associate/submit-work" },
  { id: 10, label: "Announcements", icon: MdCampaign,           path: "/associate/announcements" },
  { id: 11, label: "Notifications", icon: MdNotifications,      path: "/associate/notifications" },
  { id: 12, label: "Complaints",    icon: MdBugReport,          path: "/associate/complaints" },
  { id: 13, label: "Logout",        icon: MdLogout,             path: "logout" },
];

export const STATUS_DATA = [
  { label: "Pending",            value: "Pending" },
  { label: "Under Review",       value: "Under Review" },
  { label: "Documents Required", value: "Documents Required" },
  { label: "In Process",         value: "In Process" },
  { label: "Completed",          value: "Completed" },
  { label: "Rejected",           value: "Rejected" },
];

export const WORK_STATUSES = STATUS_DATA.map((item) => item.value);

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
export const PROJECT_STATUSES = WORK_STATUSES;

// ── Complaint statuses ────────────────────────────────────────────────────
export const COMPLAINT_STATUSES = ["Pending", "In Review", "Resolved", "Closed"];

// ── Payment methods ───────────────────────────────────────────────────────
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];
