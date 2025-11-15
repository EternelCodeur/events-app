import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser, UserRole } from "@/context/UserContext";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { role } = useUser();
  const location = useLocation();

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
