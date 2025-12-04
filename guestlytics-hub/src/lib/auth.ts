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
  if (currentToken) return currentToken;
  // Prefer persistent token if available to avoid stale session token overriding it
  try {
    const p = localStorage.getItem(TOKEN_KEY);
    if (p) return (currentToken = p);
  } catch { /* noop */ }
  try {
    const s = sessionStorage.getItem(TOKEN_SESSION_KEY);
    if (s) return (currentToken = s);
  } catch { /* noop */ }
  return null;
}

function persistAuth(user: AuthUser, token: string, remember: boolean) {
  currentUser = user;
  currentToken = token;
  if (remember) {
    // Persist in localStorage and clear session copies to avoid dual tokens
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);
    } catch { /* noop */ }
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    } catch { /* noop */ }
  } else {
    // Session-only: store in sessionStorage and clear any persistent copies
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    } catch { /* noop */ }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch { /* noop */ }
  }
}

export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const token = getToken();
  if (token) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* noop */ }
  }
  currentUser = null;
  currentToken = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_e) { void 0; }
  try { localStorage.removeItem(TOKEN_KEY); } catch (_e) { void 0; }
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_e) { void 0; }
  try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch (_e) { void 0; }
}

export async function getMe(): Promise<AuthUser | null> {
  if (currentUser) return currentUser;
  // rehydrate from storage (prefer persistent if both are present)
  try {
    const lUser = localStorage.getItem(STORAGE_KEY);
    if (lUser) currentUser = (JSON.parse(lUser) as AuthUser) ?? null;
  } catch { currentUser = null; }
  if (currentUser) return currentUser;
  try {
    const sUser = sessionStorage.getItem(SESSION_KEY);
    if (sUser) currentUser = (JSON.parse(sUser) as AuthUser) ?? null;
  } catch { currentUser = null; }
  if (currentUser) return currentUser;
  // fetch from backend if token exists
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
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
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch { /* empty */ }
    return user;
  } catch {
    return null;
  }
}

export async function refresh(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      currentUser = null;
      currentToken = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* empty */ }
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* empty */ }
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* empty */ }
      try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch { /* empty */ }
      return false;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const newToken = data?.access_token as string | undefined;
    if (!newToken) return false;
    // keep same user in memory/storage
    const user = await getMe();
    if (user) persistAuth(user, newToken, !!localStorage.getItem(TOKEN_KEY));
    else currentToken = newToken;
    return true;
  } catch {
    return false;
  }
}
