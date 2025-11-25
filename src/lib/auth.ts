import { API_BASE } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "hotesse" | "utilisateur";
};

export async function login(
  email: string,
  password: string,
  remember: boolean,
  role?: "superadmin" | "admin" | "hotesse" | "utilisateur",
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, remember, role }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Échec de la connexion";
    try {
      const data = text ? (JSON.parse(text) as { message?: string }) : null;
      if (data?.message) msg = data.message;
    } catch (_e) {
      return Promise.reject(new Error(msg));
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export async function refresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}
