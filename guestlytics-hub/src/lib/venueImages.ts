import { getToken, refresh } from "./auth";

export type VenueImageItem = {
  id: string;
  originalName: string;
  mimeType?: string;
  size: number;
  filePath: string;
  createdAt?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { Accept: "application/json", ...(await authHeaders()), ...(init.headers || {}) };
  let res = await fetch(url, { credentials: "include", ...init, headers });
  if (res.status === 401) {
    try {
      const ok = await refresh();
      if (ok) {
        const headers2 = { Accept: "application/json", ...(await authHeaders()), ...(init.headers || {}) };
        res = await fetch(url, { credentials: "include", ...init, headers: headers2 });
      }
    } catch (_) { /* ignore */ }
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getVenueImages(venueId: string): Promise<VenueImageItem[]> {
  return request<VenueImageItem[]>(`/api/venues/${encodeURIComponent(venueId)}/images`, { method: "GET" });
}

export async function getVenueImageBlobUrl(imageId: string): Promise<string> {
  const url = `/api/venue-images/${encodeURIComponent(imageId)}/file`;
  const headers = await authHeaders();
  let res = await fetch(url, { credentials: "include", headers });
  if (res.status === 401) {
    try {
      const ok = await refresh();
      if (ok) {
        res = await fetch(url, { credentials: "include", headers: await authHeaders() });
      }
    } catch (_) { /* ignore */ }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function uploadVenueImages(
  venueId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<VenueImageItem[]> {
  if (!files || files.length === 0) return [];
  const form = new FormData();
  if (files.length === 1) form.append("image", files[0]);
  else files.forEach((f) => form.append("images[]", f));

  async function doXhr(): Promise<VenueImageItem[]> {
    const token = getToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/venues/${encodeURIComponent(venueId)}/images`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (!onProgress || !e.lengthComputable) return;
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(percent);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as VenueImageItem[];
            onProgress?.(100);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        } else if (xhr.status === 401) {
          reject({ unauthorized: true });
        } else {
          reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(form);
    });
  }

  try {
    return await doXhr();
  } catch (err: unknown) {
    const e = err as { unauthorized?: boolean } | undefined;
    if (e && e.unauthorized) {
      const ok = await refresh();
      if (ok) {
        return await doXhr();
      }
    }
    throw err;
  }
}

export async function deleteVenueImage(imageId: string): Promise<void> {
  await request<void>(`/api/venue-images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}
