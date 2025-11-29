export type EventTask = {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  createdAt?: string | null;
};

export type CreateTaskPayload = { name: string };
export type UpdateTaskPayload = { name: string };

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

export async function getTasks(eventId: string): Promise<EventTask[]> {
  return request<EventTask[]>(`/api/events/${encodeURIComponent(eventId)}/tasks`, { method: "GET" });
}

export async function createTask(eventId: string, payload: CreateTaskPayload): Promise<EventTask> {
  return request<EventTask>(`/api/events/${encodeURIComponent(eventId)}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<EventTask> {
  return request<EventTask>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}
