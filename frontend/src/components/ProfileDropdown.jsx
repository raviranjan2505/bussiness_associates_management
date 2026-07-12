import React, { useState } from "react"
import { FaSignOutAlt } from "react-icons/fa"
import ProfilePhotoSelector from "./ProfilePhotoSelector"
import axiosInstance from "../utils/axioInstance"
import { useDispatch, useSelector } from "react-redux"
import { signOutSuccess, signInSuccess } from "../redux/slice/userSlice"

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const { currentUser } = useSelector((state) => state.user)

  const toggleDropdown = () => setIsOpen(!isOpen)
    console.log(currentUser, "current user profile testing")
  // ✅ Upload image to backend
  const handleImageUpload = async () => {
    if (!selectedImage) return alert("Please select an image")

    const formData = new FormData()
    formData.append("image", selectedImage)

    try {
      setLoading(true)
      const { data } = await axiosInstance.post("/auth/upload-image", formData)
      const updated = { profileImageUrl: data.imageUrl }

      const res = await axiosInstance.put("/auth/update-profile", updated)
      dispatch(signInSuccess(res.data))

      alert("Profile picture updated successfully!")
      setSelectedImage(null)
      setIsOpen(false)
    } catch (err) {
      console.error("Image upload failed:", err)
      alert("Failed to upload image")
    } finally {
      setLoading(false)
    }
  }

  // ✅ Update profile info
  const handleProfileUpdate = async () => {
    try {
      setLoading(true)
      const updated = {
        name: name || currentUser?.name,
        email: email || currentUser?.email,
        password: password || undefined,
      }

      const res = await axiosInstance.put("/auth/update-profile", updated)
      dispatch(signInSuccess(res.data))
      alert("Profile updated successfully!")
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  // ✅ Logout
  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/sign-out")
      dispatch(signOutSuccess())
      window.location.href = "/login"
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Profile Avatar */}
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition-all"
        onClick={toggleDropdown}
      >
       <img
  src={
    currentUser?.profileImageUrl
      ? `${currentUser.profileImageUrl}?t=${Date.now()}`
      : "/default-avatar.png"
  }
  alt="Profile11"
  className="w-full h-full object-cover"
/>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop: closes the panel on outside tap/click. */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Anchored directly under the sidebar avatar, matching the
              sidebar's own width (w-64) on both mobile and desktop — so it
              always sits under the sidebar rather than floating over the
              main content or spilling past its edges. */}
          <div className="absolute left-1/2 top-full z-50 mt-2 max-h-[70vh] w-64 -translate-x-1/2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          {/* Profile Image */}
          <ProfilePhotoSelector image={selectedImage} setImage={setSelectedImage} />
          <button
            onClick={handleImageUpload}
            disabled={loading}
            className="bg-blue-500 text-white py-2 rounded mt-2 w-full text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Image"}
          </button>

          {/* Update Details */}
          <div className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              placeholder={currentUser?.name || "Your name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <input
              type="email"
              placeholder={currentUser?.email || "Your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <input
              type="password"
              placeholder="New password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <button
              onClick={handleProfileUpdate}
              disabled={loading}
              className="bg-green-500 text-white py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-red-500 hover:text-red-600 w-full mt-3 text-sm"
          >
            <FaSignOutAlt /> Logout
          </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ProfileDropdown