/* eslint-disable @typescript-eslint/no-explicit-any */
// Requests use relative '/api' so Vite proxy routes to backend in dev

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "hotesse" | "utilisateur";
  entrepriseId?: string;
  entrepriseName?: string;
};

let currentUser: AuthUser | null = null;
let currentToken: string | null = null;
const STORAGE_KEY = "guestlytics_auth_user";
const SESSION_KEY = "guestlytics_auth_user_session";
const TOKEN_KEY = "guestlytics_auth_token";
const TOKEN_SESSION_KEY = "guestlytics_auth_token_session";

export function getToken(): string | null {
  return null;
}

function persistAuth(user: AuthUser, token: string, remember: boolean) {
  currentUser = user;
  currentToken = null;
}

export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as unknown as {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: AuthUser;
  };
  if (!res.ok) throw new Error((data as any)?.message || "Identifiants invalides");
  // Le backend peut ne pas renvoyer 'role'; fallback 'admin' côté UI
  const user: AuthUser = {
    id: String((data.user as Record<string, unknown>)?.id ?? ""),
    name: (data.user as Record<string, unknown>)?.name as string ?? "Utilisateur",
    email: (data.user as Record<string, unknown>)?.email as string ?? email,
    role: ((data.user as Record<string, unknown>)?.role as AuthUser["role"]) ?? ("admin" as const),
    entrepriseId: (data.user as Record<string, unknown>)?.entrepriseId as string | undefined,
    entrepriseName: (data.user as Record<string, unknown>)?.entrepriseName as string | undefined,
  };
  persistAuth(user, data.access_token, remember);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* noop */ }
  currentUser = null;
  currentToken = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_e) { void 0; }
  try { localStorage.removeItem(TOKEN_KEY); } catch (_e) { void 0; }
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_e) { void 0; }
  try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch (_e) { void 0; }
}

export async function getMe(): Promise<AuthUser | null> {
  if (currentUser) return currentUser;
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    const u = (await res.json()) as Record<string, unknown>;
    const user: AuthUser = {
      id: String((u?.id as string | number | undefined) ?? ""),
      name: (u?.name as string | undefined) ?? "Utilisateur",
      email: (u?.email as string | undefined) ?? "",
      role: (u?.role as AuthUser["role"]) ?? ("admin" as const),
      entrepriseId: u?.entrepriseId as string | undefined,
      entrepriseName: u?.entrepriseName as string | undefined,
    };
    currentUser = user;
    return user;
  } catch {
    return null;
  }
}

export async function refresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!res.ok) {
      currentUser = null;
      currentToken = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* empty */ }
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* empty */ }
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* empty */ }
      try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch { /* empty */ }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getXsrfTokenFromCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}
