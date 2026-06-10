import React from "react"

const AuthLayout = ({ children }) => {
  return (
    <div className="flex h-auto min-h-screen overflow-hidden items-center bg-auth bg-cover">
      <div className="w-full md:w-full ">
        <div className="min-h-full flex flex-col px-12 pt-8 pb-12">
          <div className="flex-grow flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout

