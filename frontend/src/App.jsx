import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import ManageUsers from "./pages/admin/ManageUsers";
import AssociateWorks from "./pages/admin/AssociateWorks";
import BusinessDashboard from "./pages/admin/BusinessDashboard";
import ManageDivisionsServices from "./pages/admin/ManageDivisionsServices";
import ReviewWorks from "./pages/admin/ReviewWorks";
import AssociateDashboard from "./pages/associate/AssociateDashboard";
import SubmitWork from "./pages/associate/SubmitWork";
import MyWorks from "./pages/associate/MyWorks";
import WorkDetails from "./pages/shared/WorkDetails";
import Notifications from "./pages/shared/Notifications";
import PrivateRoute from "./routes/PrivateRoute";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<BusinessDashboard />} />
            <Route path="/admin/divisions-services" element={<ManageDivisionsServices />} />
            <Route path="/admin/works" element={<ReviewWorks />} />
            <Route path="/admin/work/:id" element={<WorkDetails />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/users/:id" element={<AssociateWorks />} />
            <Route path="/admin/notifications" element={<Notifications />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["associate"]} />}>
            <Route path="/associate/dashboard" element={<AssociateDashboard />} />
            <Route path="/associate/submit-work" element={<SubmitWork />} />
            <Route path="/associate/works" element={<MyWorks />} />
            <Route path="/associate/work/:id" element={<WorkDetails />} />
            <Route path="/associate/notifications" element={<Notifications />} />
          </Route>

          <Route path="/" element={<Root />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
};

const Root = () => {
  const { currentUser } = useSelector((state) => state.user);

  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === "admin") return <Navigate to="/admin/dashboard" />;
  if (currentUser.role === "associate") return <Navigate to="/associate/dashboard" />;
  return <Navigate to="/login" />;
};

export default App;
