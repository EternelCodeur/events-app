import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  MapPin,
  Package,
  DollarSign,
  Settings,
  Building2 as BuildingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
import { logout as apiLogout } from "@/lib/auth";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { role, user, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const headerTitle =
    role === "superadmin"
      ? "EventPro"
      : user?.entrepriseName ?? "Nom de l'entreprise";

  const adminTabs = [
    {
      value: "dashboard",
      label: "Tableau de bord",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      value: "venues",
      label: "Gestion des salles",
      path: "/admin/venues",
      icon: MapPin,
    },
    {
      value: "events",
      label: "Gestion des événements",
      path: "/admin/events",
      icon: Calendar,
    },
    {
      value: "staff",
      label: "Gestion des employés",
      path: "/admin/staff",
      icon: UserCheck,
    },
    {
      value: "users",
      label: "Gestion des utilisateurs",
      path: "/admin/users",
      icon: User,
    },
  ];

  const superAdminTabs = [
    {
      value: "dashboard",
      label: "Tableau de bord",
      path: "/super-admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      value: "companies",
      label: "Gestion des entreprises",
      path: "/super-admin/companies",
      icon: BuildingsIcon,
    },
  ];

  const currentAdminTabValue = (() => {
    if (role !== "admin") return undefined;
    const found = adminTabs.find((tab) =>
      location.pathname.startsWith(tab.path),
    );
    return found?.value ?? "dashboard";
  })();

  const currentSuperAdminTabValue = (() => {
    if (role !== "superadmin") return undefined;
    const found = superAdminTabs.find((tab) =>
      location.pathname.startsWith(tab.path),
    );
    return found?.value ?? "dashboard";
  })();

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* noop */
    }
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card sticky top-0 z-20 px-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            {role === "superadmin" ? (
              <div className="flex items-center gap-2">
                <img src="/ng-events.png" alt="Logo" className="h-16 w-16" />
              </div>
            ) : (
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                {headerTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-muted">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profil")}>Profil</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left"
                  >
                    Déconnexion
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Admin & Super Admin top tabs navigation */}
        {(role === "admin" || role === "superadmin") && (
          <div className="border-b border-border bg-gradient-to-r from-sky-500 via-blue-500 to-orange-400 sticky top-16 z-10 px-3 py-2 h-16 lg:px-6 lg:py-3 lg:h-28 print:hidden">
            <Tabs
              value={role === "admin" ? currentAdminTabValue : currentSuperAdminTabValue}
              onValueChange={(value) => {
                const tabs = role === "admin" ? adminTabs : superAdminTabs;
                const tab = tabs.find((t) => t.value === value);
                if (tab) navigate(tab.path);
              }}
            >
              <TabsList className="w-full justify-center bg-transparent p-1 text-white flex flex-wrap gap-2">
                {(role === "admin" ? adminTabs : superAdminTabs).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-xl px-1.5 lg:mt-1 py-1.5 min-w-[32px] h-[40px] lg:min-w-[140px] lg:h-[70px] text-[14px] font-semibold text-black bg-gradient-to-br from-white via-gray-300 to-white data-[state=active]:from-black data-[state=active]:via-black data-[state=active]:to-black data-[state=active]:text-white shadow-sm flex flex-col items-center justify-center gap-1 text-center whitespace-normal break-words"
                    >
                      <Icon className="h-4 w-4 lg:h-6 lg:w-6" />
                      <span className="hidden lg:inline leading-tight">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 mt-1 print:p-0 print:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
};
