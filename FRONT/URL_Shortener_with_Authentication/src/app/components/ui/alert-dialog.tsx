import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  Copy,
  Trash2,
  Plus,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

interface ShortLink {
  id: string;
  shortcode: string;
  originalUrl: string;
  createdAt: number;
  expiresAt: number;
  clicks: number;
  userId: string;
  cachedInRedis: boolean;
  lastAccessed?: number;
}

type Page = "login" | "signup" | "dashboard";
type TabView = "active" | "expired";

const API_BASE = "http://localhost:8000";
const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 86_400_000;

function formatTTL(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / HOUR);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  const m = Math.floor((diff % HOUR) / 60_000);
  return `${h}h ${m}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateShortcode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors duration-150"
    >
      {copied ? <CheckCircle size={12} className="text-primary" /> : <Copy size={12} />}
      <span className={copied ? "text-primary" : ""}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}

function RedisBadge({ cached }: { cached: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-sm ${
        cached
          ? "bg-primary/10 text-primary border border-primary/30"
          : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      <Zap size={8} />
      {cached ? "REDIS" : "DB"}
    </span>
  );
}

function LinkRow({
  link,
  onDelete,
  onRefreshCache,
  baseUrl,
}: {
  link: ShortLink;
  onDelete: (id: string) => void;
  onRefreshCache: (id: string) => void;
  baseUrl: string;
}) {
  const isExpired = Date.now() > link.expiresAt;
  const shortUrl = `${baseUrl}/${link.shortcode}`;

  return (
    <div
      className={`group border-b border-border last:border-0 px-5 py-4 hover:bg-secondary/50 transition-colors duration-100 ${
        isExpired ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-semibold text-sm text-foreground">{link.shortcode}</span>
            <RedisBadge cached={link.cachedInRedis} />
            {isExpired && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-sm bg-destructive/10 text-destructive border border-destructive/30">
                <XCircle size={8} /> EXPIRED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-primary">{shortUrl}</span>
            <CopyButton text={shortUrl} />
          </div>

          <div className="font-mono text-xs text-muted-foreground truncate max-w-md">
            {link.originalUrl}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            {!isExpired && (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock size={11} />
                <span>{formatTTL(link.expiresAt)}</span>
              </div>
            )}
            <div className="text-xs font-mono text-muted-foreground">
              <span className="text-foreground font-semibold">{link.clicks.toLocaleString()}</span> clicks
            </div>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground">{formatDate(link.createdAt)}</div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isExpired && !link.cachedInRedis && (
              <button
                onClick={() => onRefreshCache(link.id)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Warm Redis cache"
              >
                <RefreshCw size={13} />
              </button>
            )}
            <a
              href={link.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink size={13} />
            </a>
            <button
              onClick={() => onDelete(link.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TTL_PRESETS = [
  { label: "1 hour", value: HOUR },
  { label: "6 hours", value: 6 * HOUR },
  { label: "1 day", value: DAY },
  { label: "7 days", value: 7 * DAY },
  { label: "30 days", value: 30 * DAY },
];

function CreateModal({
  onClose,
  onCreate,
  baseUrl,
}: {
  onClose: () => void;
  onCreate: (link: ShortLink) => void;
  baseUrl: string;
}) {
  const [url, setUrl] = useState("");
  const [shortcode, setShortcode] = useState(generateShortcode());
  const [ttlPreset, setTtlPreset] = useState(DAY);
  const [customTtl, setCustomTtl] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [warmCache, setWarmCache] = useState(true);
  const [errors, setErrors] = useState<{ url?: string; shortcode?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveTtl = useCustom ? (parseInt(customTtl) || 0) * HOUR : ttlPreset;

  const validate = () => {
    const e: { url?: string; shortcode?: string } = {};
    try {
      new URL(url);
    } catch {
      e.url = "Invalid URL";
    }
    if (!/^[a-z0-9_-]{2,32}$/.test(shortcode)) {
      e.shortcode = "2–32 chars, lowercase letters, digits, - or _";
    }
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const expiresAt = Date.now() + effectiveTtl;

      const res = await fetch(`${API_BASE}/links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_url: url,
          shortcode,
          expires_at: new Date(expiresAt).toISOString(),
          warm_cache: warmCache,
        }),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      const data = await res.json().catch(() => null);

      const link: ShortLink = {
        id: data?.id ?? randomId(),
        shortcode,
        originalUrl: url,
        createdAt: Date.now(),
        expiresAt,
        clicks: 0,
        userId: "u1",
        cachedInRedis: warmCache,
      };

      onCreate(link);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            <span className="font-mono font-semibold text-sm text-foreground">CREATE SHORT LINK</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
          >
            [ESC]
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">DESTINATION URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very/long/path"
              className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
            {errors.url && <p className="mt-1 text-xs font-mono text-destructive">{errors.url}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-muted-foreground">SHORTCODE</label>
              <button
                type="button"
                onClick={() => setShortcode(generateShortcode())}
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                ↻ regenerate
              </button>
            </div>
            <div className="flex items-center gap-0">
              <span className="bg-muted border border-r-0 border-border rounded-l-sm px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {baseUrl}/
              </span>
              <input
                type="text"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value.toLowerCase())}
                className="flex-1 bg-input-background border border-border rounded-r-sm px-3 py-2.5 font-mono text-sm text-primary placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            {errors.shortcode && <p className="mt-1 text-xs font-mono text-destructive">{errors.shortcode}</p>}
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">TIME-TO-LIVE (TTL)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TTL_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setTtlPreset(p.value);
                    setUseCustom(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors ${
                    !useCustom && ttlPreset === p.value
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors ${
                  useCustom
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                custom
              </button>
            </div>

            {useCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={customTtl}
                  onChange={(e) => setCustomTtl(e.target.value)}
                  placeholder="24"
                  className="w-24 bg-input-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                />
                <span className="text-xs font-mono text-muted-foreground">hours</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-sm border border-border">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-foreground">
                <Zap size={12} className="text-primary" /> Warm Redis cache on create
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                Serves from memory — sub-millisecond redirects
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWarmCache((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                warmCache ? "bg-primary" : "bg-switch-background"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${
                  warmCache ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-mono font-semibold bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {submitting ? "creating…" : "create link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthPage({
  mode,
  onAuth,
  onSwitch,
}: {
  mode: "login" | "signup";
  onAuth: (user: User) => void;
  onSwitch: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Valid email required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be ≥ 6 characters");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Name required");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, name };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Authentication failed");
        return;
      }

      onAuth({
        id: data.id || "u1",
        email: data.email || email,
        name: data.name || name || email.split("@")[0],
        createdAt: Date.now(),
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #39ff14 0px, #39ff14 1px, transparent 1px, transparent 40px)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Link2 size={20} className="text-primary" />
            <span className="font-mono font-bold text-lg text-foreground tracking-widest">SNIP.DEV</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {mode === "login" ? "sign in to your account" : "create an account"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-sm">
          <div className="px-5 py-3 border-b border-border">
            <span className="font-mono text-xs text-muted-foreground">
              {mode === "login" ? "$ auth login" : "$ auth signup"}
            </span>
          </div>

          <form onSubmit={submit} className="p-5 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@lovelace.dev"
                className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
                <XCircle size={12} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 font-mono font-semibold text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {loading ? "authenticating…" : mode === "login" ? "sign in →" : "create account →"}
            </button>
          </form>

          <div className="px-5 py-3 border-t border-border text-center">
            <span className="text-xs font-mono text-muted-foreground">
              {mode === "login" ? "no account?" : "have an account?"}{" "}
              <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors">
                {mode === "login" ? "sign up" : "sign in"}
              </button>
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-mono text-muted-foreground/50">
          links are TTL-cached via Redis · no tracking
        </p>
      </div>
    </div>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const BASE_URL = "snip.dev";
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [tab, setTab] = useState<TabView>("active");
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_BASE}/links`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      setLinks(
        Array.isArray(data)
          ? data.map((l: any) => ({
              id: String(l.id ?? l.shortcode),
              shortcode: l.shortcode,
              originalUrl: l.original_url ?? l.originalUrl,
              createdAt: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
              expiresAt: l.expires_at ? new Date(l.expires_at).getTime() : Date.now() + DAY,
              clicks: l.click_count ?? l.clicks ?? 0,
              userId: "u1",
              cachedInRedis: Boolean(l.cached_in_redis ?? l.cachedInRedis),
              lastAccessed: l.last_accessed ? new Date(l.last_accessed).getTime() : undefined,
            }))
          : []
      );
    };

    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const activeLinks = links.filter((l) => Date.now() <= l.expiresAt);
  const expiredLinks = links.filter((l) => Date.now() > l.expiresAt);
  const displayed = tab === "active" ? activeLinks : expiredLinks;

  const handleDelete = async (id: string) => {
    const target = links.find((x) => x.id === id);
    if (!target) return;
    await fetch(`${API_BASE}/links/${target.shortcode}`, {
      method: "DELETE",
      credentials: "include",
    });
    setLinks((prev) => prev.filter((x) => x.id !== id));
  };

  const handleRefreshCache = async (id: string) => {
    const target = links.find((x) => x.id === id);
    if (!target) return;
    await fetch(`${API_BASE}/links/${target.shortcode}/cache`, {
      method: "POST",
      credentials: "include",
    });
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, cachedInRedis: true } : l))
    );
  };

  const handleCreate = (link: ShortLink) => {
    setLinks((prev) => [link, ...prev]);
    setShowCreate(false);
    setTab("active");
  };

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const cacheHitRate = links.length
    ? Math.round((links.filter((l) => l.cachedInRedis).length / links.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 size={16} className="text-primary" />
            <span className="font-mono font-bold text-sm tracking-widest text-foreground">SNIP.DEV</span>
            <ChevronRight size={12} className="text-border" />
            <span className="font-mono text-xs text-muted-foreground">{user.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-mono font-semibold text-xs rounded-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={12} /> new link
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8 border border-border rounded-sm overflow-hidden">
          {[
            { label: "TOTAL LINKS", value: links.length.toString() },
            { label: "ACTIVE", value: activeLinks.length.toString(), accent: true },
            { label: "TOTAL CLICKS", value: totalClicks.toLocaleString() },
            { label: "REDIS HIT RATE", value: `${cacheHitRate}%`, accent: cacheHitRate > 50 },
          ].map((s) => (
            <div key={s.label} className="bg-card px-5 py-4">
              <p className="text-[10px] font-mono text-muted-foreground mb-1">{s.label}</p>
              <p className={`font-mono font-bold text-2xl ${s.accent ? "text-primary" : "text-foreground"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-sm">
          <div className="flex items-center border-b border-border">
            {(["active", "expired"] as TabView[]).map((t) => {
              const count = t === "active" ? activeLinks.length : expiredLinks.length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-mono border-b-2 transition-colors ${
                    tab === t
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "active" ? (
                    <CheckCircle size={11} className={tab === t ? "text-primary" : ""} />
                  ) : (
                    <XCircle size={11} className={tab === t ? "text-destructive" : ""} />
                  )}
                  {t.toUpperCase()}
                  <span
                    className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                      tab === t ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <div className="ml-auto px-5 text-[10px] font-mono text-muted-foreground/50">
              {tick >= 0 && `auto-refresh: 30s`}
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                {tab === "active" ? "no active links — create one above" : "no expired links"}
              </p>
            </div>
          ) : (
            displayed.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                onDelete={handleDelete}
                onRefreshCache={handleRefreshCache}
                baseUrl={BASE_URL}
              />
            ))
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-muted-foreground/60">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-sm bg-primary/10 text-primary border border-primary/30">
              <Zap size={8} /> REDIS
            </span>
            served from memory cache
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-sm bg-muted text-muted-foreground border border-border">
              <Zap size={8} /> DB
            </span>
            served from database
          </div>
        </div>
      </main>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          baseUrl={BASE_URL}
        />
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [user, setUser] = useState<User | null>(null);

  const handleAuth = (u: User) => {
    setUser(u);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("login");
  };

  if (page === "login" || page === "signup") {
    return (
      <AuthPage
        mode={page}
        onAuth={handleAuth}
        onSwitch={() => setPage(page === "login" ? "signup" : "login")}
      />
    );
  }

  if (page === "dashboard" && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}