import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

// ─────────────────────────────────────────────────────────────────────────
// Commission Calculator (Admin + Associate)
//
// Pure, client-side "what-if" calculator built on top of the existing
// Service/Division data. It does NOT create or touch any Work, Client,
// Invoice, Payment, Income, or Payout records — selecting services and
// entering Loan Amounts here only affects local component state.
// ─────────────────────────────────────────────────────────────────────────

// Compute the commission for a single service given its (optional) loan amount.
const computeCommission = (service, loanAmount) => {
  const commissionType = service.commissionType || "Percentage";
  const commissionValue = Number(service.commissionValue ?? service.associateEarningPercent ?? 0);

  if (commissionType === "Loan Based") {
    const amount = Number(loanAmount || 0);
    return (amount * commissionValue) / 100;
  }
  if (commissionType === "Fixed Amount") {
    return commissionValue;
  }
  // Percentage (default)
  return (Number(service.price || 0) * commissionValue) / 100;
};

const commissionLabel = (service) => {
  const commissionType = service.commissionType || "Percentage";
  const commissionValue = Number(service.commissionValue ?? service.associateEarningPercent ?? 0);
  if (commissionType === "Loan Based") return `${commissionValue}% of Loan Amount`;
  if (commissionType === "Fixed Amount") return `${formatMoney(commissionValue)} (Fixed)`;
  return `${commissionValue}%`;
};

const CommissionCalculator = () => {
  const { currentUser } = useSelector((state) => state.user);
  const isAdmin = currentUser?.role === "admin";

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // { [serviceId]: true }
  const [loanAmounts, setLoanAmounts] = useState({}); // { [serviceId]: string }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/business/services");
        // Only active services are relevant for a live commission calculation.
        const active = (res.data.services || []).filter((s) => s.isActive !== false);
        setServices(active);
      } catch (e) {
        toast.error("Failed to load services");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.division?.name?.toLowerCase().includes(term)
    );
  }, [services, search]);

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setLoanAmount = (id, value) => {
    setLoanAmounts((prev) => ({ ...prev, [id]: value }));
  };

  // ── Totals — recalculated automatically whenever selection or loan
  // amounts change (useMemo keeps this fully derived, no side effects). ──
  const { totalSelected, totalServiceCharge, totalCommission } = useMemo(() => {
    let count = 0;
    let charge = 0;
    let commission = 0;
    services.forEach((s) => {
      if (!selected[s._id]) return;
      count += 1;
      charge += Number(s.price || 0);
      commission += computeCommission(s, loanAmounts[s._id]);
    });
    return { totalSelected: count, totalServiceCharge: charge, totalCommission: commission };
  }, [services, selected, loanAmounts]);

  const clearAll = () => {
    setSelected({});
    setLoanAmounts({});
  };

  return (
    <DashboardLayout activeMenu="Commission Calculator">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Commission Calculator</h1>
          <p className="text-sm text-gray-500">
            Select services to estimate commission earnings. This is a calculator only —
            {isAdmin
              ? " nothing here is saved or converted into a Work, Invoice, Payment, or Payout."
              : " no Work, Client, or Payment record is created."}
          </p>
        </div>

        {/* Search / clear */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_140px]">
          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Search by service or division…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={clearAll}
            className="border rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            Clear Selection
          </button>
        </div>

        {/* Services table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Division</th>
                  <th className="p-3 text-right">Service Charge</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3 text-right">Loan Amount</th>
                  <th className="p-3 text-right">Estimated Commission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => {
                    const isLoanBased = s.commissionType === "Loan Based";
                    const isChecked = !!selected[s._id];
                    const rowCommission = computeCommission(s, loanAmounts[s._id]);
                    return (
                      <tr
                        key={s._id}
                        className={`border-t hover:bg-gray-50 ${isChecked ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={isChecked}
                            onChange={() => toggleSelect(s._id)}
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900">{s.name}</td>
                        <td className="p-3 text-gray-600">{s.division?.name || "—"}</td>
                        <td className="p-3 text-right text-gray-700">
                          {isLoanBased ? "Rs. 0.00" : formatMoney(s.price)}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          {commissionLabel(s)}
                        </td>
                        <td className="p-3 text-right">
                          {isLoanBased ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={!isChecked}
                              placeholder="Enter loan amount"
                              className="w-36 border rounded-lg p-2 text-right disabled:bg-gray-50 disabled:text-gray-400"
                              value={loanAmounts[s._id] ?? ""}
                              onChange={(e) => setLoanAmount(s._id, e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700">
                          {isChecked ? formatMoney(rowCommission) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && !filteredServices.length && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No active services found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Total Selected Services
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{totalSelected}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Total Service Charge <span className="text-gray-400">(for reference only)</span>
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{formatMoney(totalServiceCharge)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-emerald-600">
              Total Commission Earning
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatMoney(totalCommission)}</p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default CommissionCalculator;