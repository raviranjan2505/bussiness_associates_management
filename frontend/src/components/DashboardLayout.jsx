import React from "react"
import { useSelector } from "react-redux"
import Navbar from "./Navbar"
import SideMenu from "./SideMenu"

const DashboardLayout = ({ children, activeMenu }) => {
  const { currentUser } = useSelector((state) => state.user)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar activeMenu={activeMenu} />

      {currentUser && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar: stays fixed in place; scrolls internally only if the
              menu is taller than the viewport. Mobile overlay sidebar (rendered
              inside Navbar) is untouched. Breakpoint matches Navbar's hamburger
              (lg) exactly, so there's never a gap where neither is visible. */}
          <div className="hidden lg:block h-full shrink-0 overflow-y-auto scroll-smooth">
            <SideMenu activeMenu={activeMenu} />
          </div>

          {/* Main content: the only area that scrolls with the page on desktop */}
          <div className="grow min-w-0 mx-3 sm:mx-5 h-full overflow-y-auto scroll-smooth">{children}</div>
        </div>
      )}
    </div>
  )
}

export default DashboardLayout