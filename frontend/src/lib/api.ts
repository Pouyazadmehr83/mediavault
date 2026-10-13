import type { Album, MediaFile, Paginated, PublicShare, ShareLink, User } from "./types";

const ACCESS_KEY = "mv.access";
const REFRESH_KEY = "mv.refresh";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/* ------------------------------------------------------------------ tokens */

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  get access() {
    return read(ACCESS_KEY);
  },
  get refresh() {
    return read(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Fired when the session can no longer be refreshed; the auth provider signs out. */
export const SESSION_EXPIRED = "mv:session-expired";

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, body: unknown) {
    const fields: Record<string, string> = {};
    let message = `Request failed (${status})`;

    if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        if (key === "detail" || key === "non_field_errors") message = text;
        else fields[key] = text;
      }
      const first = Object.values(fields)[0];
      if (message.startsWith("Request failed") && first) message = first;
    }
    if (status === 0) message = "Can't reach the server. Check that the API is running.";

    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/* ------------------------------------------------------------------ core */

let refreshing: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  // Concurrent 401s share a single refresh round-trip.
  refreshing ??= fetch("/api/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = (await res.json()) as { access: string };
      tokens.set(data.access);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function expireSession() {
  tokens.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED));
}

async function parse(res: Response) {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, { method = "GET", body, auth = true }: RequestOptions = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
    return fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && auth && tokens.refresh) {
      if (await refreshAccess()) res = await send();
      else expireSession();
    }
  } catch {
    throw new ApiError(0, null);
  }

  const data = await parse(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/* ------------------------------------------------------------------ upload */

function uploadOnce(file: File, album: number | null, onProgress: (fraction: number) => void) {
  return new Promise<{ status: number; data: unknown }>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (album) form.append("album", String(album));

    // XHR (not fetch) because it reports upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/");
    if (tokens.access) xhr.setRequestHeader("Authorization", `Bearer ${tokens.access}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new ApiError(0, null));
    xhr.send(form);
  });
}

/* ------------------------------------------------------------------ endpoints */

export interface FileQuery {
  page?: number;
  page_size?: number;
  search?: string;
  album?: number;
  no_album?: boolean;
  ordering?: string;
  min_size?: number;
  max_size?: number;
  created_after?: string;
  created_before?: string;
}

export const api = {
  auth: {
    async login(email: string, password: string) {
      const data = await request<{ access: string; refresh: string }>("/api/auth/login/", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      tokens.set(data.access, data.refresh);
    },
    register(body: { email: string; password: string; first_name: string; last_name: string }) {
      return request<User>("/api/auth/register/", { method: "POST", body, auth: false });
    },
    me: () => request<User>("/api/auth/me/"),
  },

  files: {
    list: (params: FileQuery = {}) => request<Paginated<MediaFile>>(`/api/files/${query({ ...params })}`),
    get: (id: number) => request<MediaFile>(`/api/files/${id}/`),
    move: (id: number, album: number | null) =>
      request<MediaFile>(`/api/files/${id}/`, { method: "PATCH", body: { album } }),
    remove: (id: number) => request<void>(`/api/files/${id}/`, { method: "DELETE" }),
    downloadUrl: (id: number) =>
      request<{ download_url: string; expires_in: number }>(`/api/files/${id}/download/?download=1`),
    async upload(file: File, album: number | null, onProgress: (fraction: number) => void) {
      let res = await uploadOnce(file, album, onProgress);
      if (res.status === 401 && (await refreshAccess())) res = await uploadOnce(file, album, onProgress);
      else if (res.status === 401) expireSession();
      if (res.status < 200 || res.status >= 300) throw new ApiError(res.status, res.data);
      return res.data as MediaFile;
    },
  },

  albums: {
    list: (params: { page?: number; page_size?: number; search?: string; ordering?: string } = {}) =>
      request<Paginated<Album>>(`/api/albums/${query({ ...params })}`),
    get: (id: number) => request<Album>(`/api/albums/${id}/`),
    create: (body: { title: string; description?: string; is_public?: boolean }) =>
      request<Album>("/api/albums/", { method: "POST", body }),
    update: (id: number, body: Partial<Pick<Album, "title" | "description" | "is_public">>) =>
      request<Album>(`/api/albums/${id}/`, { method: "PATCH", body }),
    remove: (id: number) => request<void>(`/api/albums/${id}/`, { method: "DELETE" }),
  },

  shares: {
    list: (params: { page?: number; page_size?: number } = {}) =>
      request<Paginated<ShareLink>>(`/api/share-links/${query({ ordering: "-created_at", ...params })}`),
    create: (media_file: number, expires_at?: string) =>
      request<ShareLink>("/api/share-links/", { method: "POST", body: { media_file, expires_at } }),
    remove: (id: number) => request<void>(`/api/share-links/${id}/`, { method: "DELETE" }),
    open: (token: string) => request<PublicShare>(`/api/share/${encodeURIComponent(token)}/`, { auth: false }),
  },
};

export function shareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}
