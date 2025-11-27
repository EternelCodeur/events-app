// Requests use relative '/api' so Vite proxy routes to backend in dev

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "hotesse" | "utilisateur";
};

let currentUser: AuthUser | null = null;
const STORAGE_KEY = "guestlytics_auth_user";

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
  if (_remember) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (_e) { void 0; }
  }
  return user;
}

export async function logout(): Promise<void> {
  currentUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) { void 0; }
}

export async function getMe(): Promise<AuthUser | null> {
  if (currentUser) return currentUser;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    currentUser = parsed ?? null;
  } catch {
    currentUser = null;
  }
  return currentUser;
}

export async function refresh(): Promise<boolean> {
  if (currentUser) return true;
  const me = await getMe();
  return !!me;
}
