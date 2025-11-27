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

// In-memory mock database
let companies: Company[] = [
  {
    id: "coy-1",
    name: "Acme Events",
    email: "contact@acme.test",
    phone: "+33 1 23 45 67 89",
    adminName: "Alice",
    status: "active",
  },
  {
    id: "coy-2",
    name: "Nguia Entertainment",
    email: "hello@nguia.test",
    phone: "+33 6 00 00 00 00",
    adminName: "Bob",
    status: "inactive",
  },
];

function delay(ms = 150): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getCompanies(): Promise<Company[]> {
  await delay();
  return companies.slice();
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
  await delay();
  const newCompany: Company = {
    id: Math.random().toString(36).slice(2),
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    adminName: payload.adminName ?? null,
    status: "active",
  };
  companies = [newCompany, ...companies];
  return newCompany;
}

export async function updateCompany(
  id: string,
  payload: CompanyUpdatePayload,
): Promise<Company> {
  await delay();
  const idx = companies.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Company not found");
  const updated: Company = { ...companies[idx], ...payload };
  companies[idx] = updated;
  return updated;
}

export async function deleteCompany(id: string): Promise<void> {
  await delay();
  const before = companies.length;
  companies = companies.filter((c) => c.id !== id);
  if (companies.length === before) throw new Error("Company not found");
}

export async function updateCompanyStatus(
  id: string,
  status: "active" | "inactive",
): Promise<Company> {
  return updateCompany(id, { status });
}
