import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/admin/Dashboard";
import Events from "./pages/admin/Events";
import EventManagement from "./pages/admin/EventManagement";
import EventGuests from "./pages/admin/EventGuests";
import EventTables from "./pages/admin/EventTables";
import EventStaff from "./pages/admin/EventStaff";
import Staff from "./pages/admin/Staff";
import StaffAttendancePage from "./pages/admin/StaffAttendancePage";
import Venues from "./pages/admin/Venues";
import NotFound from "./pages/NotFound";
import Companies from "./pages/super-admin/Companies";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import Checkins from "./pages/agent/Checkins";
import GuestsAgent from "./pages/agent/GuestsAgent";
import UserPointages from "./pages/user/UserPointages";
import Login from "./pages/Login";
import { UserProvider } from "./context/UserContext";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            {/* Espace Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Events />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:id/manage"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <EventManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:id/guests"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <EventGuests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:id/tables"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <EventTables />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:id/staff"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <EventStaff />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Staff />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff/:id/attendance"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <StaffAttendancePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
           
            <Route
              path="/admin/venues"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Venues />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logistics"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <div className="p-6"><h1 className="text-3xl font-bold">Logistique</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <div className="p-6"><h1 className="text-3xl font-bold">Finance</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <div className="p-6"><h1 className="text-3xl font-bold">Paramètres</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Espace Super Admin */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]}>
                  <AppLayout>
                    <SuperAdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]}>
                  <AppLayout>
                    <Companies />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Espace Hôtesse */}
            <Route
              path="/hotesse/guests"
              element={
                <ProtectedRoute allowedRoles={["hotesse"]}>
                  <AppLayout>
                    <GuestsAgent />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Espace Utilisateur */}
            <Route
              path="/utilisateur/pointages"
              element={
                <ProtectedRoute allowedRoles={["utilisateur"]}>
                  <AppLayout>
                    <UserPointages />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
