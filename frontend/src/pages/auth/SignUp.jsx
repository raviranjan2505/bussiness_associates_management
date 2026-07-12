import React, { useState } from "react"
import AuthLayout from "../../components/AuthLayout"
import { FaEyeSlash } from "react-icons/fa6"
import { FaEye } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import { validateEmail } from "../../utils/helper"
import ProfilePhotoSelector from "../../components/ProfilePhotoSelector"
import axiosInstance from "../../utils/axioInstance"
import uploadImage from "../../utils/uploadImage"

const SignUp = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState(null)
  const [profileImageUrl, setProfileImageUrl] = useState(null)

  // const handleSubmit = async (e) => {
  //   e.preventDefault()

  //   let profileImageUrl = ""

  //   if (!fullName) {
  //     setError("Please enter the name")
  //     return
  //   }

  //   if (!validateEmail(email)) {
  //     setError("Please enter a valid email address")
  //     return
  //   }

  //   if (!password) {
  //     setError("Please enter the password")
  //     return
  //   }

  //   setError(null)

  //   // SignUp API call
  //   try {
  //     // Upload profile picture if present
  //     if (profilePic) {
  //       const imageUploadRes = await uploadImage(profilePic)
  //       profileImageUrl = imageUploadRes.imageUrl || ""
  //     }

  //     const response = await axiosInstance.post("/auth/sign-up", {
  //       name: fullName,
  //       email,
  //       password,
  //       profileImageUrl,
  //       adminJoinCode: adminInviteToken,
  //     })

  //     if (response.data) {
  //       navigate("/login")
  //     }
  //   } catch (error) {
  //     if (error.response && error.response.data.message) {
  //       setError(error.response.data.message)
  //       console.log(error)
  //     } else {
  //       setError("Something went wrong. Please try again!")
  //     }
  //   }
  // }

  console.log(profileImageUrl, "profile image to set")
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!fullName || !validateEmail(email) || !password || !confirmPassword) {
    setError("Please fill all fields correctly");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", fullName);
    formData.append("email", email);
    formData.append("password", password);
    if (profileImageUrl) formData.append("image", profileImageUrl);

    const response = await axiosInstance.post("/auth/sign-up", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data) navigate("/login");
  } catch (error) {
    console.log(error)
    setError(error.response?.data?.message || "Signup failed");
  }
};

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Gradient top border */}
          <div className="h-2 bg-gradient-to-r from-[#ff0101] to-[#ff4d4d]"></div>

          <div className="p-4">
            {/* Logo and title */}
            <div className="text-center mb-2">
              <div className="flex justify-center">
                <img
                  src="/logo.png"
                  alt="Indian Money Master logo"
                  className="h-16 w-auto object-contain"
                />
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mt-4 uppercase">
                Create Account
              </h1>

              <p className="text-gray-600 mt-1">
                Start managing your Work efficiently
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <ProfilePhotoSelector
                image={profileImageUrl}
                setImage={setProfileImageUrl}
              />

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff0101] focus:border-transparent"
                  placeholder="Your Full Name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff0101] focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="•••••••"
                    required
                  />

                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff0101] focus:border-transparent pr-12"
                    placeholder="•••••••"
                    required
                  />

                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff0101] hover:bg-[#d60000] focus:outline-none focus:ring-0 focus:ring-offset-0 cursor-pointer uppercase"
                >
                  Sign Up
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Already have an accout?{" "}
                <Link
                  to={"/login"}
                  className="font-medium text-[#ff0101] hover:text-[#d60000]"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

export default SignUp
