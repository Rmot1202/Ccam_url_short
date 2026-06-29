import { API_BASE } from "./utils";
import type { AuthPayload, LinkCreatePayload, ShortLink, User } from "./types";

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function apiMe(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;

  const data = await readJson(res);
  return {
    id: String(data.id ?? "u1"),
    email: data.email ?? "",
    name: data.user_name ?? data.name ?? data.email?.split("@")[0] ?? "user",
    createdAt: Date.now(),
  };
}

export async function apiLogin(payload: AuthPayload) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
  return readJson(res).then((data) => ({ ok: res.ok, data }));
}

export async function apiSignup(payload: AuthPayload) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_name: payload.name,
      email: payload.email,
      password: payload.password,
    }),
  });
  return readJson(res).then((data) => ({ ok: res.ok, data }));
}

export async function apiLogout() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function apiListLinks(): Promise<ShortLink[]> {
  const res = await fetch(`${API_BASE}/links`, { credentials: "include" });
  if (!res.ok) return [];

  const data = await readJson(res);
  return Array.isArray(data)
    ? data.map((l: any) => ({
        shortcode: l.short_code ?? l.shortcode,
        originalUrl: l.original_url ?? l.originalUrl,
        createdAt: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
        expiresAt: l.expires_at ? new Date(l.expires_at).getTime() : Date.now() + 86400_000,
        clicks: l.click_count ?? l.clicks ?? 0,
        userId: "u1",
        cachedInRedis: Boolean(l.cached_in_redis ?? l.cachedInRedis),
        lastAccessed: l.last_accessed ? new Date(l.last_accessed).getTime() : undefined,
      }))
    : [];
}

export async function apiCreateLink(payload: LinkCreatePayload) {
  const res = await fetch(`${API_BASE}/shorten`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      original_url: payload.original_url,
      custom_alias: payload.custom_alias,
      expires_at: payload.expires_at,
    }),
  });

  const data = await readJson(res);
  return { ok: res.ok, data };
}

export async function apiDeleteLink(shortcode: string) {
  await fetch(`${API_BASE}/${shortcode}`, {
    method: "DELETE",
    credentials: "include",
  });
}