export type Company = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  adminName?: string | null;
  status: "active" | "inactive";
};

export type CompanyPayload = {
  name: string;
  email?: string;
  phone?: string;
  adminName?: string;
};

export type CompanyUpdatePayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  adminName?: string | null;
  status?: "active" | "inactive";
};

const API_BASE = "/api/entreprises";

// Lazy import to avoid circular deps between auth and api
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
    typeof x === "object" &&
    x !== null &&
    "message" in x &&
    typeof (x as { message?: unknown }).message === "string"
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const headers: HeadersInit = init.body
    ? { "Content-Type": "application/json", ...authHeader, ...(init.headers || {}) }
    : { ...authHeader, ...(init.headers || {}) };
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg = hasMessage(data) ? data.message : `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function getCompanies(): Promise<Company[]> {
  return request<Company[]>(`${API_BASE}`, { method: "GET" });
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
  return request<Company>(`${API_BASE}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompany(
  id: string,
  payload: CompanyUpdatePayload,
): Promise<Company> {
  return request<Company>(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCompany(id: string): Promise<void> {
  await request<void>(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateCompanyStatus(
  id: string,
  status: "active" | "inactive",
): Promise<Company> {
  return updateCompany(id, { status });
}
