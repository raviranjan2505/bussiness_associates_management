import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";

// Auth
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";

// Admin pages
import BusinessDashboard from "./pages/admin/BusinessDashboard";
import ManageDivisionsServices from "./pages/admin/ManageDivisionsServices";
import AdminPaymentSettings from "./pages/admin/PaymentSettings";
import ReviewWorks from "./pages/admin/ReviewWorks";
import AllClients from "./pages/admin/AllClients";
import MyClients from "./pages/associate/MyClients";
import ClientDetail from "./pages/shared/ClientDetail";
import ClientLeads from "./pages/shared/ClientLeads";
import ClientWorksList from "./pages/shared/ClientWorksList";
import ClientForm from "./pages/shared/ClientForm";
import ManageUsers from "./pages/admin/ManageUsers";
import AssociateWorks from "./pages/admin/AssociateWorks";
import AssociateLeadGroups from "./pages/admin/AssociateLeadGroups";
import AssociateClientLeads from "./pages/admin/AssociateClientLeads";
import AssociateClientWorks from "./pages/admin/AssociateClientWorks";
import AdminQuotations from "./pages/admin/Quotations";
import AdminIncome from "./pages/admin/AdminIncome";
import AdminIncomeClients from "./pages/admin/AdminIncomeClients";
import AdminIncomeWorks from "./pages/admin/AdminIncomeWorks";
import ManagePayout from "./pages/admin/ManagePayout";
import AssociateIncome from "./pages/associate/AssociateIncome";
import AssociateIncomeWorks from "./pages/associate/AssociateIncomeWorks";
import CreateQuotation from "./pages/admin/CreateQuotation";
import AdminInvoices from "./pages/admin/Invoices";
import AdminPayments from "./pages/admin/Payments";
import AdminProjects from "./pages/admin/Projects";
import AdminComplaints from "./pages/admin/Complaints";
import Leads from "./pages/admin/Leads";
import LeadDetails from "./pages/admin/LeadDetails";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import KycRequests from "./pages/admin/KycRequests";
import KycDetails from "./pages/admin/KycDetails";

// Associate pages
import AssociateDashboard from "./pages/associate/AssociateDashboard";
import SubmitWork from "./pages/associate/SubmitWork";
import MyWorks from "./pages/associate/MyWorks";
import AssociateQuotations from "./pages/associate/AssociateQuotations";
import AssociateInvoices from "./pages/associate/AssociateInvoices";
import AssociatePayments from "./pages/associate/AssociatePayments";
import AssociateComplaints from "./pages/associate/AssociateComplaints";
import MyLeads from "./pages/associate/MyLeads";
import Announcements from "./pages/associate/Announcements";
import AssociateLeadDetails from "./pages/associate/LeadDetails";
import SubmitKyc from "./pages/associate/SubmitKyc";

// Shared pages
import WorkDetails from "./pages/shared/WorkDetails";
import Notifications from "./pages/shared/Notifications";
import QuotationDetail from "./pages/shared/QuotationDetail";
import InvoiceDetail from "./pages/shared/InvoiceDetail";
import ComplaintDetail from "./pages/shared/ComplaintDetail";
import CommissionCalculator from "./pages/shared/CommissionCalculator";

import PrivateRoute from "./routes/PrivateRoute";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* ── Admin routes ──────────────────────────────── */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<BusinessDashboard />} />
            <Route path="/admin/divisions-services" element={<ManageDivisionsServices />} />
            <Route path="/admin/payment-settings" element={<AdminPaymentSettings />} />
            <Route path="/admin/works" element={<ReviewWorks />} />
            {/* Income & Payout */}
            <Route path="/admin/income" element={<AdminIncome />} />
            <Route path="/admin/income/:associateId/clients" element={<AdminIncomeClients />} />
            <Route path="/admin/income/:associateId/clients/:clientName/works" element={<AdminIncomeWorks />} />
            <Route path="/admin/income/payout/:invoiceId" element={<ManagePayout />} />
            <Route path="/admin/clients" element={<AllClients />} />
            <Route path="/admin/clients/add" element={<ClientForm />} />
            <Route path="/admin/clients/:id/edit" element={<ClientForm />} />
            <Route path="/admin/clients/:clientId" element={<ClientDetail />} />
            <Route path="/admin/clients/:clientId/leads" element={<ClientLeads />} />
            <Route path="/admin/clients/:clientId/works" element={<ClientWorksList />} />
            <Route path="/admin/work/:id" element={<WorkDetails />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/users/:id/leads" element={<AssociateLeadGroups />} />
            <Route path="/admin/users/:id/leads/:clientKey" element={<AssociateClientLeads />} />
            <Route path="/admin/users/:id/works" element={<AssociateWorks />} />
            <Route path="/admin/users/:id/works/:clientKey" element={<AssociateClientWorks />} />
            <Route path="/admin/users/:id" element={<AssociateWorks />} />
            <Route path="/admin/notifications" element={<Notifications />} />
            {/* Quotations */}
            <Route path="/admin/quotations" element={<AdminQuotations />} />
            <Route path="/admin/quotations/create" element={<CreateQuotation />} />
            <Route path="/admin/quotations/:id" element={<QuotationDetail />} />
            <Route path="/admin/leads" element={<Leads />} />
            <Route path="/admin/leads/:id" element={<LeadDetails />} />
            {/* Invoices */}
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/invoices/:id" element={<InvoiceDetail />} />
            {/* Payments */}
            <Route path="/admin/payments" element={<AdminPayments />} />
            {/* Projects */}
            <Route path="/admin/projects" element={<AdminProjects />} />
            {/* Complaints */}
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/complaints/:id" element={<ComplaintDetail />} />
            {/* Announcements */}
            <Route path="/admin/announcements" element={<ManageAnnouncements />} />
            {/* Commission Calculator */}
            <Route path="/admin/commission-calculator" element={<CommissionCalculator />} />
            {/* KYC Requests */}
            <Route path="/admin/kyc-requests" element={<KycRequests />} />
            <Route path="/admin/kyc-requests/:userId" element={<KycDetails />} />
          </Route>

          {/* ── Associate routes ──────────────────────────── */}
          <Route element={<PrivateRoute allowedRoles={["associate"]} />}>
            <Route path="/associate/dashboard" element={<AssociateDashboard />} />
            <Route path="/associate/submit-work" element={<SubmitWork />} />
            <Route path="/associate/leads" element={<MyLeads />} />
            <Route path="/associate/leads/:id" element={<AssociateLeadDetails />} />
            <Route path="/associate/works" element={<MyWorks />} />
            {/* Income */}
            <Route path="/associate/income" element={<AssociateIncome />} />
            <Route path="/associate/income/:clientName/works" element={<AssociateIncomeWorks />} />
            <Route path="/associate/clients" element={<MyClients />} />
            <Route path="/associate/clients/add" element={<ClientForm />} />
            <Route path="/associate/clients/:id/edit" element={<ClientForm />} />
            <Route path="/associate/clients/:clientId" element={<ClientDetail />} />
            <Route path="/associate/clients/:clientId/leads" element={<ClientLeads />} />
            <Route path="/associate/clients/:clientId/works" element={<ClientWorksList />} />
            <Route path="/associate/work/:id" element={<WorkDetails />} />
            <Route path="/associate/announcements" element={<Announcements />} />
            <Route path="/associate/notifications" element={<Notifications />} />
            {/* Quotations */}
            <Route path="/associate/quotations" element={<AssociateQuotations />} />
            <Route path="/associate/quotations/:id" element={<QuotationDetail />} />
            {/* Invoices */}
            <Route path="/associate/invoices" element={<AssociateInvoices />} />
            <Route path="/associate/invoices/:id" element={<InvoiceDetail />} />
            {/* Payments */}
            <Route path="/associate/payments" element={<AssociatePayments />} />
            {/* Complaints */}
            <Route path="/associate/complaints" element={<AssociateComplaints />} />
            <Route path="/associate/complaints/:id" element={<ComplaintDetail />} />
            {/* Commission Calculator */}
            <Route path="/associate/commission-calculator" element={<CommissionCalculator />} />
            {/* Submit KYC */}
            <Route path="/associate/submit-kyc" element={<SubmitKyc />} />
          </Route>

          <Route path="/" element={<Root />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
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