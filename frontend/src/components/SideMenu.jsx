import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import axiosInstance from "../utils/axioInstance"
import { signOutSuccess } from "../redux/slice/userSlice"
import { ASSOCIATE_SIDE_MENU_DATA, SIDE_MENU_DATA } from "../utils/data"
import ProfileDropdown from "./ProfileDropdown"

const SideMenu = ({ activeMenu }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [SideMenuData, setSideMenuData] = useState([])
  const { currentUser } = useSelector((state) => state.user)

  const handleClick = (route) => {
    if (route === "logout") {
      handleLogout()
      return
    }
    navigate(route)
  }

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/sign-out")
      dispatch(signOutSuccess())
      navigate("/login")
    } catch (error) {
      console.error(error)
    }
  }
  useEffect(()=>{
    if(currentUser){
      if(currentUser.role === 'admin'){
        setSideMenuData(SIDE_MENU_DATA);
      }
      else if(currentUser.role === "associate"){
        setSideMenuData(ASSOCIATE_SIDE_MENU_DATA);
      } else {
        setSideMenuData([]);
      }
    }
  },[currentUser])
  return (
    <div className="w-64 p-6 h-full flex flex-col lg:border-r lg:border-gray-200 bg-white">
      <div className="flex flex-col items-center mb-8 relative">
        <ProfileDropdown />

        {currentUser?.role === "admin" && (
          <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2">
            admin
          </div>
        )}

        {currentUser?.role === "associate" && (
          <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2">
            Associate
          </div>
        )}

        <h5 className="text-lg font-semibold text-gray-800 mt-1">
          {currentUser?.name || ""}
        </h5>
        <p className="text-sm text-gray-500">{currentUser?.email || ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {SideMenuData.map((item, index) => (
          <button
            key={`menu_${index}`}
            className={`w-full flex items-center gap-4 text-[15px] ${
              activeMenu === item.label
                ? "text-blue-500 bg-blue-50"
                : "text-gray-700 hover:bg-gray-100"
            } py-3 px-6 mb-3 rounded-lg transition-all`}
            onClick={() => handleClick(item.path)}
          >
            <item.icon className="text-2xl" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SideMenu
