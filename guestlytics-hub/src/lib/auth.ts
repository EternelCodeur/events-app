// Requests use relative '/api' so Vite proxy routes to backend in dev

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "hotesse" | "utilisateur";
};

let currentUser: AuthUser | null = null;

export async function login(
  email: string,
  _password: string,
  _remember: boolean,
  role?: "superadmin" | "admin" | "hotesse" | "utilisateur",
): Promise<AuthUser> {
  const inferredRole = role
    ?? (email.toLowerCase().includes("super")
      ? "superadmin"
      : email.toLowerCase().includes("hotesse")
      ? "hotesse"
      : email.toLowerCase().includes("user")
      ? "utilisateur"
      : "admin");
  const user: AuthUser = {
    id: Math.random().toString(36).slice(2),
    name: email.split("@")[0] || "Utilisateur",
    email,
    role: inferredRole,
  };
  currentUser = user;
  return user;
}

export async function logout(): Promise<void> {
  currentUser = null;
}

export async function getMe(): Promise<AuthUser | null> {
  return currentUser;
}

export async function refresh(): Promise<boolean> {
  return !!currentUser;
}
