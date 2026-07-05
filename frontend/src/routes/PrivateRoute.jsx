import React from "react"
import { useSelector } from "react-redux"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { ASSOCIATE_KYC_ALLOWED_PATHS } from "../utils/data"

const PrivateRoute = ({ allowedRoles }) => {
  const { currentUser } = useSelector((state) => state.user)
  const location = useLocation()

  if (!currentUser) return <Navigate to="/login" replace />
  if (allowedRoles?.length && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  // KYC gate — until an associate's KYC is Approved, lock every page except
  // Dashboard, Commission Calculator, Submit KYC, and Logout.
  if (
    currentUser.role === "associate" &&
    currentUser.kycStatus &&
    currentUser.kycStatus !== "Approved" &&
    !ASSOCIATE_KYC_ALLOWED_PATHS.includes(location.pathname)
  ) {
    return <Navigate to="/associate/submit-kyc" replace />
  }

  return <Outlet />
}

export default PrivateRoute