import { createContext, ReactNode, useContext, useState } from "react";

export type UserRole = "superadmin" | "admin" | "hotesse" | "utilisateur";

interface UserContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // Rôle simulé côté front pour l'instant, avec persistance simple
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") {
      return "admin";
    }
    const stored = window.localStorage.getItem("guestlytics_role");
    if (stored === "superadmin" || stored === "admin" || stored === "hotesse" || stored === "utilisateur") {
      return stored;
    }
    return "admin";
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("guestlytics_role", newRole);
    }
  };

  return (
    <UserContext.Provider value={{ role, setRole }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
};
