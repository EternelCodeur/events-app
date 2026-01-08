import { API_BASE_URL } from "./config";

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
    try { data = JSON.parse(text) as unknown; } catch { data = { message: text } as unknown; }
  }
  if (!res.ok) {
    const msg = hasMessage(data) ? data.message : `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

type ProvidersIndexResponse = {
  data: ProviderItem[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  extra?: {
    totals?: { amount_cfa?: number; advance_cfa?: number; rest_cfa?: number };
  };
};

export type ProvidersPageResult = {
  items: ProviderItem[];
  page: number;
  lastPage: number;
  perPage: number;
  total: number;
  totals: { amountCfa: number; advanceCfa: number; restCfa: number };
};

export async function getProviders(eventId: string): Promise<ProviderItem[]> {
  const res = await request<unknown>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/providers`, { method: "GET" });
  if (Array.isArray(res)) return res as ProviderItem[];
  const obj = res as ProvidersIndexResponse;
  return Array.isArray(obj?.data) ? (obj.data as ProviderItem[]) : [];
}

export async function getProvidersPage(eventId: string, page = 1, perPage = 7): Promise<ProvidersPageResult> {
  const res = await request<ProvidersIndexResponse>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/providers?page=${encodeURIComponent(String(page))}&perPage=${encodeURIComponent(String(perPage))}`, { method: "GET" });
  const items = Array.isArray(res.data) ? res.data : [];
  const pageNum = res.meta?.current_page ?? page;
  const lastPage = res.meta?.last_page ?? page;
  const per = res.meta?.per_page ?? perPage;
  const total = res.meta?.total ?? items.length;
  const totals = {
    amountCfa: Number(res.extra?.totals?.amount_cfa ?? 0),
    advanceCfa: Number(res.extra?.totals?.advance_cfa ?? 0),
    restCfa: Number(res.extra?.totals?.rest_cfa ?? 0),
  };
  return { items, page: Number(pageNum), lastPage: Number(lastPage), perPage: Number(per), total: Number(total), totals };
}

export async function createProvider(eventId: string, payload: CreateProviderPayload): Promise<ProviderItem> {
  return request<ProviderItem>(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/providers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProvider(id: string, payload: UpdateProviderPayload): Promise<ProviderItem> {
  return request<ProviderItem>(`${API_BASE_URL}/api/providers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProvider(id: string): Promise<void> {
  await request<void>(`${API_BASE_URL}/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
}
