import type { StaffMember } from "./staff";
import { API_BASE_URL } from "./config";

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
  let res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (res.status === 401) {
    try {
      const { refresh } = await import("./auth");
      const ok = await refresh();
      if (ok) {
        const newAuth = await getAuthHeader();
        const headers2: HeadersInit = init.body
          ? { "Content-Type": "application/json", Accept: "application/json", ...newAuth, ...(init.headers || {}) }
          : { Accept: "application/json", ...newAuth, ...(init.headers || {}) };
        res = await fetch(path, { credentials: "include", ...init, headers: headers2 });
      }
    } catch { /* noop */ }
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text } as unknown;
    }
  }
  if (!res.ok) {
    const msg = hasMessage(data) ? data.message : `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function getAssignments(eventId: string): Promise<StaffMember[]> {
  return request<StaffMember[]>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/assignments`, { method: "GET" });
}

export async function addAssignment(eventId: string, staffId: string): Promise<StaffMember> {
  return request<StaffMember>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/assignments`, {
    method: "POST",
    body: JSON.stringify({ staffId: Number(staffId) }),
  });
}

export async function removeAssignment(eventId: string, staffId: string): Promise<void> {
  await request<void>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/assignments/${encodeURIComponent(staffId)}`, {
    method: "DELETE",
  });
}
