import type { StaffMember } from "./staff";

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

export async function getTaskAssignments(eventId: string, taskId: string): Promise<StaffMember[]> {
  return request<StaffMember[]>(`/api/events/${encodeURIComponent(eventId)}/tasks/${encodeURIComponent(taskId)}/assignments`, { method: "GET" });
}

export async function addTaskAssignment(eventId: string, taskId: string, staffId: string): Promise<StaffMember> {
  return request<StaffMember>(`/api/events/${encodeURIComponent(eventId)}/tasks/${encodeURIComponent(taskId)}/assignments`, {
    method: "POST",
    body: JSON.stringify({ staffId: Number(staffId) }),
  });
}

export async function removeTaskAssignment(eventId: string, taskId: string, staffId: string): Promise<void> {
  await request<void>(`/api/events/${encodeURIComponent(eventId)}/tasks/${encodeURIComponent(taskId)}/assignments/${encodeURIComponent(staffId)}`, {
    method: "DELETE",
  });
}
