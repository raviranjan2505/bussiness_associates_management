import React, { useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";
import SideMenu from "./SideMenu";
import NotificationBell from "./NotificationBell";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 h-16 bg-white shadow-sm flex items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex items-center shrink-0">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-red-50 text-[#ff0101]"
            onClick={() => setOpenSideMenu(true)}
          >
            <MdMenu className="text-2xl" />
          </button>
          <img
            src="/logo.png"
            alt="Indian Money Master logo"
            className="hidden lg:block h-9 w-auto object-contain ml-2"
          />
        </div>

        <h2 className="text-base sm:text-xl font-semibold text-[#ff0101] truncate text-center">
          Indian Money Master
        </h2>

        <div className="shrink-0">
          <NotificationBell />
        </div>
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
            <div className="flex items-center justify-between p-4 border-b border-red-100 gap-2">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Indian Money Master logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <button onClick={() => setOpenSideMenu(false)} className="text-[#ff0101]">
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