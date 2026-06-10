import React from "react"
import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"

const PrivateRoute = ({ allowedRoles }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) return <Navigate to="/login" replace />
  if (allowedRoles?.length && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default PrivateRoute
