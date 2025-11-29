export type ProviderItem = {
  id: string;
  eventId: string;
  type?: string | null;
  designation: string;
  amountCfa: number;
  advanceCfa: number;
  restToPayCfa: number;
  comments?: string | null;
  contact?: string | null;
  createdAt?: string | null;
};

export type CreateProviderPayload = {
  type?: string;
  designation: string;
  amountCfa: number; // integer CFA
  advanceCfa?: number; // integer CFA
  comments?: string;
  contact?: string;
};

export type UpdateProviderPayload = Partial<CreateProviderPayload>;

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

export async function getProviders(eventId: string): Promise<ProviderItem[]> {
  return request<ProviderItem[]>(`/api/events/${encodeURIComponent(eventId)}/providers`, { method: "GET" });
}

export async function createProvider(eventId: string, payload: CreateProviderPayload): Promise<ProviderItem> {
  return request<ProviderItem>(`/api/events/${encodeURIComponent(eventId)}/providers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProvider(id: string, payload: UpdateProviderPayload): Promise<ProviderItem> {
  return request<ProviderItem>(`/api/providers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProvider(id: string): Promise<void> {
  await request<void>(`/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
}
