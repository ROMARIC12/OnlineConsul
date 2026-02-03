import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import SplashScreen from "./pages/SplashScreen";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DoctorProfile from "./pages/DoctorProfile";
import Dashboard from "./pages/dashboard/Dashboard";
import Teleconsultation from "./pages/patient/Teleconsultation";
import Users from "./pages/dashboard/Users";
import Profile from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import TeleconsultationSuccess from "./pages/TeleconsultationSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Entry Routes */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/role-select" element={<RoleSelect />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Doctor Profile (public for viewing, requires patient for booking) */}
          <Route path="/doctor/:id" element={<DoctorProfile />} />

          {/* Payment Callback Routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />
          <Route path="/teleconsultation/success" element={<TeleconsultationSuccess />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="teleconsultation" element={<Teleconsultation />} />
            <Route path="users" element={<Users />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
