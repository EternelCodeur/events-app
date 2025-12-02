import { getToken, refresh } from "./auth";

export type EventImageItem = {
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
    } catch (_) { /* ignore */ void 0; }
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getEventImages(eventId: string): Promise<EventImageItem[]> {
  return request<EventImageItem[]>(`/api/events/${encodeURIComponent(eventId)}/images`, { method: "GET" });
}

export async function getImageBlobUrl(imageId: string): Promise<string> {
  const url = `/api/event-images/${encodeURIComponent(imageId)}/file`;
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
  const objUrl = URL.createObjectURL(blob);
  return objUrl;
}

export async function uploadEventImages(
  eventId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<EventImageItem[]> {
  if (!files || files.length === 0) return [];
  const form = new FormData();
  if (files.length === 1) form.append("image", files[0]);
  else files.forEach((f) => form.append("images[]", f));

  async function doXhr(): Promise<EventImageItem[]> {
    const token = getToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/events/${encodeURIComponent(eventId)}/images`);
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
            const data = JSON.parse(xhr.responseText) as EventImageItem[];
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

export async function deleteEventImage(imageId: string): Promise<void> {
  await request<void>(`/api/event-images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}
