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

// Allow base URL to be provided via Vite define in vite.config.ts (e.g., define: { __API_BASE__: JSON.stringify('http://localhost:8000') })
declare const __API_BASE__: string;

export const API_BASE: string =
  ((typeof __API_BASE__ !== "undefined" && __API_BASE__) as string) ||
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:8000";

export async function getCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/api/companies`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch companies");
  return (await res.json()) as Company[];
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
  const res = await fetch(`${API_BASE}/api/companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Failed to create company";
    const text = await res.text();
    let data: { message?: string } | null = null;
    try {
      data = text ? (JSON.parse(text) as { message?: string }) : null;
    } catch (_e) {
      data = null;
    }
    if (data && data.message) msg = data.message;
    throw new Error(msg);
  }
  return (await res.json()) as Company;
}

export async function updateCompany(
  id: string,
  payload: CompanyUpdatePayload,
): Promise<Company> {
  const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Failed to update company";
    const text = await res.text();
    let data: { message?: string } | null = null;
    try {
      data = text ? (JSON.parse(text) as { message?: string }) : null;
    } catch (_e) {
      data = null;
    }
    if (data && data.message) msg = data.message;
    throw new Error(msg);
  }
  return (await res.json()) as Company;
}

export async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Failed to delete company";
    const text = await res.text();
    let data: { message?: string } | null = null;
    try {
      data = text ? (JSON.parse(text) as { message?: string }) : null;
    } catch (_e) {
      data = null;
    }
    if (data && data.message) msg = data.message;
    throw new Error(msg);
  }
}

export async function updateCompanyStatus(
  id: string,
  status: "active" | "inactive",
): Promise<Company> {
  const res = await fetch(`${API_BASE}/api/companies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ status }),
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Failed to update company";
    const text = await res.text();
    let data: { message?: string } | null = null;
    try {
      data = text ? (JSON.parse(text) as { message?: string }) : null;
    } catch (_e) {
      data = null;
    }
    if (data && data.message) msg = data.message;
    throw new Error(msg);
  }
  return (await res.json()) as Company;
}
