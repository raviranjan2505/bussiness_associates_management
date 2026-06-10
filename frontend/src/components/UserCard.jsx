import React from "react"
import moment from "moment"

const UserCard = ({ userInfo }) => {
  return (
    <div className="p-2 bg-white rounded-xl shadow-md shadow-gray-100 border border-gray-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={userInfo?.profileImageUrl}
            alt={userInfo?.name}
            className="h-12 w-12 rounded-full object-cover border-2 border-white"
          />

          <div className="">
            <p className="text-lg font-medium">{userInfo?.name}</p>

            <p className="text-sm text-gray-500">{userInfo?.email}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 text-sm">
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
          Associate
        </span>
        <span className="text-gray-500">
          Joined {userInfo?.createdAt ? moment(userInfo.createdAt).format("DD MMM YYYY") : "-"}
        </span>
      </div>
    </div>
  )
}

export default UserCard
