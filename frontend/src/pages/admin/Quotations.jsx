import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import { FileText, PenLine, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { QUOTATION_STATUSES } from "../../utils/data";
import { formatMoney } from "../../utils/helper";

const AdminQuotations = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: params.get("status") || "", from: "", to: "" });
  const [loading, setLoading] = useState(false);
 const [data, setData] = useState({ statistics: {} });


  useEffect(() => {
    axiosInstance.get("/business/dashboard/admin").then((res) => setData(res.data)).catch(console.error);
  }, []);

  const s = data.statistics || {};
  const load = async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get("/quotations", { params: p });
      setQuotations(res.data.quotations || []);
    } catch (e) {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendQuotation = async (id) => {
    try {
      await axiosInstance.post(`/quotations/${id}/send`);
      toast.success("Quotation sent to associate");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const downloadPdf = (id) => window.open(`${axiosInstance.defaults.baseURL}/quotations/${id}/pdf`, "_blank");

  return (
    <DashboardLayout activeMenu="Quotations">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500">Manage and send quotations to associates.</p>
          </div>
          <Link to="/admin/quotations/create" className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            + New Quotation
          </Link>
        </div>
<section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Quotations</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatLink icon={FileText}     title="Total Quotations"    value={s.totalQuotations || 0}    to="/admin/quotations"            color="purple" />
            <StatLink icon={PenLine}      title="Draft"               value={s.draftQuotations || 0}    to="/admin/quotations?status=Draft"    color="gray" />
            <StatLink icon={CheckCircle2} title="Accepted"            value={s.acceptedQuotations || 0} to="/admin/quotations?status=Accepted" color="green" />
            <StatLink icon={XCircle}      title="Rejected"            value={s.rejectedQuotations || 0} to="/admin/quotations?status=Rejected" color="red" />
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-5">
          <input className="border rounded-lg p-2 col-span-2" placeholder="Search…" value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="border rounded-lg p-2" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" className="border rounded-lg p-2" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <button onClick={load} className="bg-gray-900 text-white rounded-lg px-4 py-2">Search</button>
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Associate</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{q.customerName}</p>
                      <p className="text-xs text-gray-500">{q.customerEmail}</p>
                    </td>
                    <td className="p-3">{q.associate?.name}</td>
                    <td className="p-3 font-medium">{formatMoney(q.totalAmount)}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                    <td className="p-3">{moment(q.createdAt).format("DD MMM YYYY")}</td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <Link to={`/admin/quotations/${q._id}`} className="text-blue-700 text-xs font-medium hover:underline">View</Link>
                      {q.status === "Draft" && (
                        <button onClick={() => sendQuotation(q._id)} className="text-green-700 text-xs font-medium hover:underline">Send</button>
                      )}
                      <button onClick={() => downloadPdf(q._id)} className="text-gray-600 text-xs font-medium hover:underline">PDF</button>
                    </td>
                  </tr>
                ))}
                {!loading && !quotations.length && (
                  <tr><td className="p-4 text-gray-500" colSpan={7}>No quotations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

const STAT_COLORS = {
  blue:    { bg: "from-blue-50 to-white",    icon: "bg-blue-600/10 text-blue-600",    value: "text-blue-950",    ring: "hover:ring-blue-100" },
  indigo:  { bg: "from-indigo-50 to-white",  icon: "bg-indigo-600/10 text-indigo-600", value: "text-indigo-950", ring: "hover:ring-indigo-100" },
  amber:   { bg: "from-amber-50 to-white",   icon: "bg-amber-500/15 text-amber-600",  value: "text-amber-950",  ring: "hover:ring-amber-100" },
  emerald: { bg: "from-emerald-50 to-white", icon: "bg-emerald-600/10 text-emerald-600", value: "text-emerald-950", ring: "hover:ring-emerald-100" },
  green:   { bg: "from-green-50 to-white",   icon: "bg-green-600/10 text-green-600",  value: "text-green-950",  ring: "hover:ring-green-100" },
  purple:  { bg: "from-purple-50 to-white",  icon: "bg-purple-600/10 text-purple-600", value: "text-purple-950", ring: "hover:ring-purple-100" },
  rose:    { bg: "from-rose-50 to-white",    icon: "bg-rose-600/10 text-rose-600",    value: "text-rose-950",   ring: "hover:ring-rose-100" },
  gray:    { bg: "from-gray-50 to-white",    icon: "bg-gray-600/10 text-gray-600",    value: "text-gray-900",   ring: "hover:ring-gray-100" },
  red:     { bg: "from-red-50 to-white",     icon: "bg-red-600/10 text-red-600",      value: "text-red-950",    ring: "hover:ring-red-100" },
};

const Stat = ({ title, value, color = "blue", icon: Icon, clickable = false }) => {
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
      {clickable && (
        <span className="pointer-events-none absolute right-4 top-4 text-gray-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          →
        </span>
      )}
    </div>
  );
};

const StatLink = ({ title, value, to, color, icon }) => (
  <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300 rounded-xl">
    <Stat title={title} value={value} color={color} icon={icon} clickable />
  </Link>
);
export default AdminQuotations;