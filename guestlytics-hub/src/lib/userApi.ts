import { API_BASE_URL } from "./config";

export type AppRole = "hotesse" | "utilisateur";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  entrepriseId?: string | null;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: AppRole;
  entrepriseId?: string; // backend will ignore for admin and use admin's entreprise
};

export type UpdateUserPayload = Partial<CreateUserPayload> & { password?: string };

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const { getToken } = await import("./auth");
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function hasMessage(x: unknown): x is { message: string } {
  return (
    typeof x === "object" && x !== null &&
    "message" in (x as Record<string, unknown>) &&
    typeof (x as { message?: unknown }).message === "string"
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const headers: HeadersInit = init.body
    ? { "Content-Type": "application/json", Accept: "application/json", ...authHeader, ...(init.headers || {}) }
    : { Accept: "application/json", ...authHeader, ...(init.headers || {}) };
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text) as unknown; } catch { data = { message: text } as unknown; }
  }
  if (!res.ok) {
    const msg = hasMessage(data) ? data.message : `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function listUsers(): Promise<AppUser[]> {
  return request<AppUser[]>(`${API_BASE_URL}/api/users`, { method: "GET" });
}

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  return request<AppUser>(`${API_BASE_URL}/api/users`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AppUser> {
  return request<AppUser>(`${API_BASE_URL}/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`${API_BASE_URL}/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
