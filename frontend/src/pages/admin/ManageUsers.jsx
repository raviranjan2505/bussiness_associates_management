import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";

const ManageUsers = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const getAllUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/users/get-users");
      setAllUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("Error fetching users: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  const filteredUsers = allUsers.filter((user) => {
    const text = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const { page, totalPages, paged: pagedUsers, resetPage, onPrev, onNext } = usePagination(filteredUsers, 10);
  useEffect(() => { resetPage(); }, [search]);

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Associates</h2>
            <p className="text-sm text-gray-500">Click Leads or Work to view that associate's clients, grouped.</p>
          </div>
          <input
            className="w-full md:w-80 border rounded-lg p-3"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-left text-white">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Total Income</th>
                  <th className="p-3 text-center">Leads</th>
                  <th className="p-3 text-center">Work</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={6}>
                      Loading associates…
                    </td>
                  </tr>
                ) : filteredUsers.length ? (
                  pagedUsers.map((user) => (
                    <tr key={user._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{user.name}</td>
                      <td className="p-3 text-gray-600">{user.email}</td>
                      <td className="p-3 text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        ₹{(user.totalIncome || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          to={`/admin/users/${user._id}/leads`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          📋 {user.leadsCount ?? 0} Leads
                        </Link>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          to={`/admin/users/${user._id}/works`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          🗂️ {user.worksCount ?? 0} Work
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={6}>
                      No associates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={filteredUsers.length} pageSize={10} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageUsers;