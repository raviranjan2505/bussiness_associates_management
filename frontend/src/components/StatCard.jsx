import React from "react";
import { Link } from "react-router-dom";

// Single source of truth for every summary-card color used across the app
// (Dashboards, Work List, Quotations, Invoices, Payments, Income — admin &
// associate). Keeping this in one place is what keeps every page's cards
// looking identical.
export const STAT_COLORS = {
  blue:    { bg: "from-blue-50 to-white",    icon: "bg-blue-600/10 text-blue-600",     value: "text-blue-950",    ring: "hover:ring-blue-100" },
  indigo:  { bg: "from-indigo-50 to-white",  icon: "bg-indigo-600/10 text-indigo-600", value: "text-indigo-950",  ring: "hover:ring-indigo-100" },
  amber:   { bg: "from-amber-50 to-white",   icon: "bg-amber-500/15 text-amber-600",   value: "text-amber-950",   ring: "hover:ring-amber-100" },
  emerald: { bg: "from-emerald-50 to-white", icon: "bg-emerald-600/10 text-emerald-600", value: "text-emerald-950", ring: "hover:ring-emerald-100" },
  green:   { bg: "from-green-50 to-white",   icon: "bg-green-600/10 text-green-600",   value: "text-green-950",   ring: "hover:ring-green-100" },
  purple:  { bg: "from-purple-50 to-white",  icon: "bg-purple-600/10 text-purple-600", value: "text-purple-950",  ring: "hover:ring-purple-100" },
  rose:    { bg: "from-rose-50 to-white",    icon: "bg-rose-600/10 text-rose-600",     value: "text-rose-950",    ring: "hover:ring-rose-100" },
  gray:    { bg: "from-gray-50 to-white",    icon: "bg-gray-600/10 text-gray-600",     value: "text-gray-900",    ring: "hover:ring-gray-100" },
  red:     { bg: "from-red-50 to-white",     icon: "bg-red-600/10 text-red-600",       value: "text-red-950",     ring: "hover:ring-red-100" },
  orange:  { bg: "from-orange-50 to-white",  icon: "bg-orange-600/10 text-orange-600", value: "text-orange-950",  ring: "hover:ring-orange-100" },
};

// Plain, non-clickable stat card.
export const StatCard = ({ title, value, color = "blue", icon: Icon, clickable = false, subtitle }) => {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br ${c.bg} p-5 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.ring} ${clickable ? "cursor-pointer" : ""}`}
    >
      {Icon && (
        <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${c.value}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
      {clickable && (
        <span className="pointer-events-none absolute right-4 top-4 text-gray-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          →
        </span>
      )}
    </div>
  );
};

// Same card, wrapped in a Link — used wherever the card should navigate
// somewhere (e.g. Total Associates → the associates list).
export const StatCardLink = ({ title, value, to, color, icon, subtitle }) => (
  <Link to={to} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300">
    <StatCard title={title} value={value} color={color} icon={icon} subtitle={subtitle} clickable />
  </Link>
);

export default StatCard;