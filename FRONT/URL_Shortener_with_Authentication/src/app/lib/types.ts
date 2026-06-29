export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface ShortLink {
  shortcode: string;
  originalUrl: string;
  createdAt: number;
  expiresAt: number;
  clicks: number;
  userId: string;
  cachedInRedis: boolean;
  lastAccessed?: number;
}

export type Page = "login" | "signup" | "dashboard";
export type TabView = "active" | "expired";

export interface LinkCreatePayload {
  original_url: string;
  custom_alias?: string;
  expires_at: string;
  warm_cache?: boolean;
}

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}