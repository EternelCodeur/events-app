export type VenueStatus = "vide" | "en_attente" | "occupe";
export type VenueArea = "interieur" | "exterieur" | "les_deux";

export type Venue = {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: VenueStatus;
  area: VenueArea;
};

export type CreateVenuePayload = {
  name: string;
  capacity: number;
  location: string;
  area: VenueArea;
  status?: VenueStatus;
  // For superadmin only
  entrepriseId?: string;
};

export type UpdateVenuePayload = Partial<CreateVenuePayload>;

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const { getToken } = await import("./auth");
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
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
  function hasMessage(x: unknown): x is { message: string } {
    return (
      typeof x === "object" && x !== null &&
      "message" in (x as Record<string, unknown>) &&
      typeof (x as { message?: unknown }).message === "string"
    );
  }
  if (!res.ok) {
    const msg = hasMessage(data) ? data.message : `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

const API_BASE = "/api/venues";

export async function getVenues(): Promise<Venue[]> {
  return request<Venue[]>(`${API_BASE}`, { method: "GET" });
}

export async function createVenue(payload: CreateVenuePayload): Promise<Venue> {
  return request<Venue>(`${API_BASE}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVenue(id: string, payload: UpdateVenuePayload): Promise<Venue> {
  return request<Venue>(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteVenue(id: string): Promise<void> {
  await request<void>(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
