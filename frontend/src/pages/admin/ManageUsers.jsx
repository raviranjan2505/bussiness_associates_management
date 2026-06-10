import React, { useEffect, useState } from "react"
import axiosInstance from "../../utils/axioInstance"
import DashboardLayout from "../../components/DashboardLayout"
import UserCard from "../../components/UserCard"

const ManageUsers = () => {
  const [allUsers, setAllUsers] = useState([])

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get("/users/get-users")

      if (response.data?.length > 0) {
        setAllUsers(response.data)
      }
    } catch (error) {
      console.log("Error fetching users: ", error)
    }
  }

  useEffect(() => {
    getAllUsers()

    return () => {}
  }, [])

  return (
    <DashboardLayout activeMenu={"Associates"}>
      <div className="mt-5 mb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Associates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {allUsers?.map((user) => (
            <UserCard key={user._id} userInfo={user} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ManageUsers
