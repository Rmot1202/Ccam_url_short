//export const API_BASE = "http://localhost:8000";
export const API_BASE = "https://ccam-url-short.onrender.com:8000";
export const HOUR = 3600_000;
export const DAY = 86_400_000;

export function formatTTL(expiresAt: number | null): string {
  if (expiresAt === null) return "never expires";
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / HOUR);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  const m = Math.floor((diff % HOUR) / 60_000);
  return `${h}h ${m}m`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function generateShortcode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
