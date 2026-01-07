export type StaffStatus = "active" | "inactive";

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  status: StaffStatus;
};

export type CreateStaffPayload = {
  name: string;
  role: string;
  phone?: string;
  status?: StaffStatus; // default inactive
  entrepriseId?: string; // superadmin override
};

export type UpdateStaffPayload = Partial<CreateStaffPayload>;

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

const API_BASE = "/api/staff";

export async function getStaff(): Promise<StaffMember[]> {
  return request<StaffMember[]>(`${API_BASE}`, { method: "GET" });
}

export async function getAvailableStaffForEvent(eventId: string): Promise<StaffMember[]> {
  const url = `${API_BASE}?eventId=${encodeURIComponent(eventId)}`;
  return request<StaffMember[]>(url, { method: "GET" });
}

export async function createStaff(payload: CreateStaffPayload): Promise<StaffMember> {
  return request<StaffMember>(`${API_BASE}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaff(id: string, payload: UpdateStaffPayload): Promise<StaffMember> {
  return request<StaffMember>(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStaff(id: string): Promise<void> {
  await request<void>(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
