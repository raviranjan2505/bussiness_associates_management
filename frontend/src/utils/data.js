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
  MdCalculate,
  MdAssignmentInd,
  MdVerifiedUser,
  MdSettings,
} from "react-icons/md";

// ── Admin side menu ────────────────────────────────────────────────────────
export const SIDE_MENU_DATA = [
  { id: 1,  label: "Dashboard",           icon: MdDashboardCustomize, path: "/admin/dashboard" },
  { id: 2,  label: "Services",            icon: MdDomain,             path: "/admin/divisions-services" },
  { id: 3,  label: "Associates",          icon: MdPeopleAlt,          path: "/admin/users" },
  { id: 4,  label: "KYC Requests",        icon: MdVerifiedUser,       path: "/admin/kyc-requests" },
  { id: 5,  label: "Client List",         icon: MdManageHistory,      path: "/admin/clients" },
  { id: 6,  label: "New Leads",           icon: MdCampaign,           path: "/admin/leads" },
  { id: 7,  label: "Quotations",          icon: MdRequestQuote,       path: "/admin/quotations" },
  { id: 8,  label: "Invoices",            icon: MdReceiptLong,        path: "/admin/invoices" },
  { id: 9,  label: "Payments",            icon: MdPayments,           path: "/admin/payments" },
  { id: 17, label: "Payment Settings",    icon: MdSettings,           path: "/admin/payment-settings" },
  { id: 10, label: "Income",              icon: MdCurrencyRupee,      path: "/admin/income" },
  { id: 11, label: "Work",                icon: MdFolderOpen,         path: "/admin/projects" },
  { id: 12, label: "Calculator", icon: MdCalculate,        path: "/admin/commission-calculator" },
  { id: 13, label: "Announcements",       icon: MdCampaign,           path: "/admin/announcements" },
  { id: 14, label: "Notifications",       icon: MdNotifications,      path: "/admin/notifications" },
  { id: 15, label: "Complaints",          icon: MdBugReport,          path: "/admin/complaints" },
  { id: 16, label: "Logout",              icon: MdLogout,             path: "logout" },
];

// ── Associate side menu ───────────────────────────────────────────────────
export const ASSOCIATE_SIDE_MENU_DATA = [
  { id: 1,  label: "Dashboard",     icon: MdDashboardCustomize, path: "/associate/dashboard" },
  { id: 2,  label: "Submit KYC",    icon: MdAssignmentInd,      path: "/associate/submit-kyc" },
  { id: 3,  label: "Client List",   icon: MdManageHistory,      path: "/associate/clients" },
  { id: 4,  label: "My Leads",      icon: MdCampaign,           path: "/associate/leads" },
  { id: 5,  label: "Quotations",    icon: MdRequestQuote,       path: "/associate/quotations" },
  { id: 6,  label: "Invoices",      icon: MdReceiptLong,        path: "/associate/invoices" },
  { id: 7,  label: "Payments",      icon: MdPayments,           path: "/associate/payments" },
  { id: 8,  label: "Income",        icon: MdCurrencyRupee,      path: "/associate/income" },
  { id: 9,  label: "Works",         icon: MdFolderOpen,         path: "/associate/works" },
  { id: 10, label: "Submit Work",   icon: MdOutlineTaskAlt,     path: "/associate/submit-work" },
  { id: 11, label: "Calculator",    icon: MdCalculate,  path: "/associate/commission-calculator" },
  { id: 12, label: "Announcements", icon: MdCampaign,           path: "/associate/announcements" },
  { id: 13, label: "Notifications", icon: MdNotifications,      path: "/associate/notifications" },
  { id: 14, label: "Complaints",    icon: MdBugReport,          path: "/associate/complaints" },
  { id: 15, label: "Logout",        icon: MdLogout,             path: "logout" },
];

// ── KYC access control ─────────────────────────────────────────────────────
// Paths an associate may visit while their KYC is "Pending" or "Rejected".
// Everything else redirects to the Submit KYC page until an admin approves it.
export const ASSOCIATE_KYC_ALLOWED_PATHS = [
  "/associate/dashboard",
  "/associate/commission-calculator",
  "/associate/submit-kyc",
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
export const PAYMENT_STATUSES = ["Pending", "Verified", "Failed"];