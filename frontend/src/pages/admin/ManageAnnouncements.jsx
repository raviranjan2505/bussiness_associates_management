import React, { useEffect, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/DashboardLayout";
import Pagination, { usePagination } from "../../components/Pagination";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";
import { MdEdit, MdDelete, MdAdd } from "react-icons/md";

const ManageAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    priority: "Medium",
    expiryDate: "",
  });

  const { page, totalPages, paged: pagedAnnouncements, resetPage, onPrev, onNext } = usePagination(announcements, 10);

  const load = async () => {
    try {
      const res = await axiosInstance.get("/announcements", { params: { isActive: "true" } });
      setAnnouncements(res.data.announcements || []);
      resetPage();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axiosInstance.put(`/announcements/${editingId}`, form);
        toast.success("Announcement updated");
      } else {
        await axiosInstance.post("/announcements", form);
        toast.success("Announcement created");
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const handleEdit = (announcement) => {
    setForm({
      title: announcement.title,
      description: announcement.description,
      content: announcement.content || "",
      priority: announcement.priority || "Medium",
      expiryDate: announcement.expiryDate ? moment(announcement.expiryDate).format("YYYY-MM-DD") : "",
    });
    setEditingId(announcement._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await axiosInstance.delete(`/announcements/${id}`);
      toast.success("Announcement deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      content: "",
      priority: "Medium",
      expiryDate: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <DashboardLayout activeMenu="Announcements">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-sm text-gray-500">Create and manage announcements for all associates.</p>
          </div>
          <button
            onClick={() => (!editingId ? setShowForm(!showForm) : resetForm())}
            className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2"
          >
            <MdAdd className="text-lg" />
            {editingId ? "Cancel Edit" : "New Announcement"}
          </button>
        </div>

        {/* Announcement Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-100 rounded-lg p-6 space-y-4"
          >
            <h2 className="font-semibold text-gray-900">
              {editingId ? "Edit Announcement" : "Create New Announcement"}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description (visible in list)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Content
              </label>
              <textarea
                className="w-full border rounded-lg p-2 resize-none"
                rows="4"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Detailed announcement content (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                className="w-full border rounded-lg p-2"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium"
              >
                {editingId ? "Update Announcement" : "Create Announcement"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-300 rounded-lg px-5 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Announcements List */}
        <section className="space-y-3">
          {announcements.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">No announcements yet.</p>
            </div>
          ) : (
            pagedAnnouncements.map((announcement) => (
              <div
                key={announcement._id}
                className={`bg-white border rounded-lg p-5 space-y-3 ${
                  announcement.priority === "High"
                    ? "border-red-200 bg-red-50"
                    : announcement.priority === "Medium"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {announcement.title}
                      </h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          announcement.priority === "High"
                            ? "bg-red-200 text-red-800"
                            : announcement.priority === "Medium"
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-green-200 text-green-800"
                        }`}
                      >
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{announcement.description}</p>
                    {announcement.content && (
                      <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500 mt-3">
                      <span>
                        By: <strong>{announcement.createdBy?.name}</strong>
                      </span>
                      <span>
                        Posted: <strong>{moment(announcement.createdAt).format("DD MMM YYYY")}</strong>
                      </span>
                      {announcement.expiryDate && (
                        <span>
                          Expires:{" "}
                          <strong>{moment(announcement.expiryDate).format("DD MMM YYYY")}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg p-2"
                    >
                      <MdEdit className="text-lg" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg p-2"
                    >
                      <MdDelete className="text-lg" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
        {announcements.length > 0 && (
          <div className="rounded-lg border border-gray-100 bg-white">
            <Pagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} totalItems={announcements.length} pageSize={10} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageAnnouncements;
