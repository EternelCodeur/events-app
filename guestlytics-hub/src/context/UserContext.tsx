import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import { getMe, refresh } from "@/lib/auth";

export type UserRole = "superadmin" | "admin" | "hotesse" | "utilisateur";

interface UserContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await getMe();
        if (active) setUser(me);
        if (!me) {
          const ok = await refresh();
          if (ok) {
            const me2 = await getMe();
            if (active) setUser(me2);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const role: UserRole = useMemo(() => {
    const raw = (user?.role ?? "admin") as string;
    if (raw === "user") return "utilisateur";
    if (raw === "superadmin" || raw === "admin" || raw === "hotesse" || raw === "utilisateur") return raw as UserRole;
    return "admin";
  }, [user]);

  const setRole = (newRole: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
  };

  return (
    <UserContext.Provider value={{ role, setRole, user, loading, setUser }}>
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
