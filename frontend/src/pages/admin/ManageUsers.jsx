import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import axiosInstance from "../../utils/axioInstance";

const ManageUsers = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get("/users/get-users");
      setAllUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("Error fetching users: ", error);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  const filteredUsers = allUsers.filter((user) => {
    const text = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <DashboardLayout activeMenu="Associates">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Associates</h2>
            <p className="text-sm text-gray-500">Select an associate to review all of their work records.</p>
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
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Total Income</th>
                  <th className="p-3">View Leads</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{user.name}</td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3 text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-semibold text-green-600">₹{(user.totalIncome || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      <Link className="text-blue-700 font-medium" to={`/admin/leads?associate=${user._id}`} state={{ associateName: user.name }}>
                        View Leads
                      </Link>
                    </td>
                    <td className="p-3">
                      <Link className="text-blue-700 font-medium" to={`/admin/users/${user._id}`}>
                        View Works
                      </Link>
                    </td>
                  </tr>
                ))}
                {!filteredUsers.length && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={6}>
                      No associates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManageUsers;
