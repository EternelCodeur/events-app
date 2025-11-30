/* eslint-disable @typescript-eslint/no-explicit-any */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
import Users from "./pages/admin/Users";
import NotFound from "./pages/NotFound";
import Companies from "./pages/super-admin/Companies";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CompanyEvents from "./pages/super-admin/CompanyEvents";
import Checkins from "./pages/agent/Checkins";
import GuestsAgent from "./pages/agent/GuestsAgent";
import UserPointages from "./pages/user/UserPointages";
import Login from "./pages/Login";
import { UserProvider } from "./context/UserContext";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    // Auth
    { path: "/", element: <Login /> },
    { path: "/login", element: <Login /> },

    // Admin
    {
      path: "/admin/dashboard",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/events",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <Events />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/events/:id/manage",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <EventManagement />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/events/:id/guests",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <EventGuests />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/events/:id/tables",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <EventTables />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/events/:id/staff",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <EventStaff />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/staff",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <Staff />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/users",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <Users />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/staff/:id/attendance",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <StaffAttendancePage />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/venues",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <Venues />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/logistics",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <div className="p-6"><h1 className="text-3xl font-bold">Logistique</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/finance",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <div className="p-6"><h1 className="text-3xl font-bold">Finance</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/settings",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <AppLayout>
            <div className="p-6"><h1 className="text-3xl font-bold">Paramètres</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div>
          </AppLayout>
        </ProtectedRoute>
      ),
    },

    // Super Admin
    {
      path: "/super-admin/dashboard",
      element: (
        <ProtectedRoute allowedRoles={["superadmin"]}>
          <AppLayout>
            <SuperAdminDashboard />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/super-admin/companies",
      element: (
        <ProtectedRoute allowedRoles={["superadmin"]}>
          <AppLayout>
            <Companies />
          </AppLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: "/super-admin/companies/:id/events",
      element: (
        <ProtectedRoute allowedRoles={["superadmin"]}>
          <AppLayout>
            <CompanyEvents />
          </AppLayout>
        </ProtectedRoute>
      ),
    },

    // Hôtesse
    {
      path: "/hotesse/guests",
      element: (
        <ProtectedRoute allowedRoles={["hotesse"]}>
          <AppLayout>
            <GuestsAgent />
          </AppLayout>
        </ProtectedRoute>
      ),
    },

    // Utilisateur
    {
      path: "/utilisateur/pointages",
      element: (
        <ProtectedRoute allowedRoles={["utilisateur"]}>
          <AppLayout>
            <UserPointages />
          </AppLayout>
        </ProtectedRoute>
      ),
    },

    // Profil
    {
      path: "/profil",
      element: (
        <ProtectedRoute allowedRoles={["admin", "superadmin", "hotesse", "utilisateur"]}>
          <AppLayout>
            <Profile />
          </AppLayout>
        </ProtectedRoute>
      ),
    },

    // Not found
    { path: "*", element: <NotFound /> },
  ],
  ({
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  } as any)
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
