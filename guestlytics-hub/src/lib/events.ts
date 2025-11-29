export type EventStatus = "en_attente" | "confirme" | "annuler";
export type VenueArea = "interieur" | "exterieur" | "les_deux";
export type EventType = "mariage" | "celebration_religieuse" | "cocktail";

export type EventItem = {
  id: string;
  title: string;
  folderPath?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  venue: string; // venue id as string (or empty)
  guests: number;
  status: EventStatus;
  budget?: string;
  capacity?: number; // mirrors guests if used by UI
  eventType?: EventType;
  areaChoice?: VenueArea;
  mariageInteriorSubtype?: "civil" | "coutumier";
  mariageExteriorSubtype?: "civil" | "coutumier";
};

export type CreateEventPayload = {
  title?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venueId?: string; // numeric id as string; omitted if non-numeric
  guests?: number;
  budget?: string;
  status?: EventStatus; // default en_attente
  eventType?: EventType;
  areaChoice?: VenueArea;
  mariageInteriorSubtype?: "civil" | "coutumier";
  mariageExteriorSubtype?: "civil" | "coutumier";
  entrepriseId?: string; // superadmin optional override
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

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

const API_BASE = "/api/events";

export async function getEvents(): Promise<EventItem[]> {
  return request<EventItem[]>(`${API_BASE}`, { method: "GET" });
}

export async function createEvent(payload: CreateEventPayload): Promise<EventItem> {
  const venueIdNum = payload.venueId && /^\d+$/.test(payload.venueId) ? Number(payload.venueId) : undefined;
  const body = JSON.stringify({ ...payload, venueId: venueIdNum });
  return request<EventItem>(`${API_BASE}`, { method: "POST", body });
}

export async function updateEvent(id: string, payload: UpdateEventPayload): Promise<EventItem> {
  const venueIdNum = payload.venueId && /^\d+$/.test(payload.venueId) ? Number(payload.venueId) : undefined;
  const body = JSON.stringify({ ...payload, venueId: venueIdNum });
  return request<EventItem>(`${API_BASE}/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export async function deleteEvent(id: string): Promise<void> {
  await request<void>(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
