import React, { useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";
import SideMenu from "./SideMenu";
import NotificationBell from "./NotificationBell";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 h-16 bg-white shadow-sm flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setOpenSideMenu(true)}
          >
            <MdMenu className="text-2xl" />
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800">
          Indian Money Master
        </h2>

        <NotificationBell />
      </div>

      {openSideMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenSideMenu(false)}
          />

          {/* Sidebar */}
          <div className="relative w-64 h-full bg-white shadow-xl flex flex-col">
            <div className="flex justify-end p-4 border-b">
              <button onClick={() => setOpenSideMenu(false)}>
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
              <SideMenu activeMenu={activeMenu} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;