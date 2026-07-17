import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import StatusBadge from "../../components/StatusBadge";

const KycRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/kyc/requests");
      setRequests(res.data.requests || []);
    } catch (e) {
      toast.error("Failed to load KYC requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = requests.filter((r) => {
    const text = `${r.name || ""} ${r.email || ""} ${r.mobile || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.kycStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { page, totalPages, paged: pagedRequests, resetPage, onPrev, onNext } = usePagination(filtered, 10);
  useEffect(() => { resetPage(); }, [search, statusFilter]);

  const approve = async (id) => {
    setActingId(id);
    try {
      await axiosInstance.post(`/kyc/${id}/approve`);
      toast.success("KYC approved");
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, kycStatus: "Approved" } : r)));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve KYC");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    const rejectionReason = window.prompt("Reason for rejecting this KYC:");
    if (rejectionReason === null) return;
    if (!rejectionReason.trim()) return toast.error("Rejection reason is required");
    setActingId(id);
    try {
      await axiosInstance.post(`/kyc/${id}/reject`, { rejectionReason });
      toast.success("KYC rejected");
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, kycStatus: "Rejected" } : r)));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reject KYC");
    } finally {
      setActingId(null);
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Permanently delete associate "${name}"? This cannot be undone.`)) return;
    setActingId(id);
    try {
      await axiosInstance.delete(`/kyc/associate/${id}`);
      toast.success("Associate deleted");
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete associate");
    } finally {
      setActingId(null);
    }
  };

  return (
    <DashboardLayout activeMenu="KYC Requests">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">KYC Requests</h1>
          <p className="text-sm text-gray-500">Review, approve, or reject KYC submissions from associates.</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 bg-white border border-gray-100 rounded-lg p-4 md:grid-cols-[1fr_200px]">
          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Search by name, email or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded-lg p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Registration Date</th>
                  <th className="p-3">KYC Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">Loading…</td>
                  </tr>
                ) : (
                  pagedRequests.map((r) => (
                    <tr key={r._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{r.name}</td>
                      <td className="p-3 text-gray-600">{r.mobile}</td>
                      <td className="p-3 text-gray-600">{r.email}</td>
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        <div>{moment(r.registrationDate).format("DD MMM YYYY")}</div>
                        <div className="text-xs text-gray-400">{moment(r.registrationDate).format("hh:mm A")}</div>
                      </td>
                      <td className="p-3"><StatusBadge status={r.kycStatus} /></td>
                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          <Link
                            to={`/admin/kyc-requests/${r._id}`}
                            className="text-blue-700 text-xs font-medium hover:underline"
                          >
                            View Details
                          </Link>
                          {r.kycStatus === "Pending" && r.hasSubmittedKyc && (
                            <>
                              <button
                                onClick={() => approve(r._id)}
                                disabled={actingId === r._id}
                                className="text-green-700 text-xs font-semibold hover:underline disabled:opacity-50"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => reject(r._id)}
                                disabled={actingId === r._id}
                                className="text-red-600 text-xs font-semibold hover:underline disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => remove(r._id, r.name)}
                            disabled={actingId === r._id}
                            className="text-gray-500 text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            Delete Associate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && !filtered.length && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">No associates found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filtered.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default KycRequests;