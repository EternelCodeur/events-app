import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  MapPin,
  DollarSign,
  Settings,
  Package,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/" },
  { icon: Calendar, label: "Événements", path: "/events" },
  { icon: MapPin, label: "Salles", path: "/venues" },
  { icon: Users, label: "Invités", path: "/guests" },
  { icon: UserCheck, label: "Personnel", path: "/staff" },
  { icon: Package, label: "Logistique", path: "/logistics" },
  { icon: DollarSign, label: "Finance", path: "/finance" },
  { icon: Settings, label: "Paramètres", path: "/settings" },
];

export const AppSidebar = ({ open }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
        open ? "w-64" : "w-0 overflow-hidden"
      )}
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          {open && (
            <div>
              <h2 className="font-bold text-foreground">EventPro</h2>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-muted",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
