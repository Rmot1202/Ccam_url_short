import { useEffect, useState } from "react";
import { CheckCircle, LogOut, Plus, XCircle } from "lucide-react";
import type { ShortLink, TabView, User } from "../../lib/types";
import { apiDeleteLink, apiListLinks } from "../../lib/api";
import LinkRow from "./LinkRow";
import CreateModal from "./CreateModal";
import StatsCards from "./StatsCards";

export default function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const BASE_URL = "http://localhost:8000";
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [tab, setTab] = useState<TabView>("active");
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiListLinks().then(setLinks);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const activeLinks = links.filter((l) => l.expiresAt === null || Date.now() <= l.expiresAt);
  const expiredLinks = links.filter((l) => l.expiresAt !== null && Date.now() > l.expiresAt);
  const displayed = tab === "active" ? activeLinks : expiredLinks;

  const handleDelete = async (id: string) => {
    const target = links.find((x) => x.shortcode === id);
    if (!target) return;
    const ok = await apiDeleteLink(target.shortcode);
    if (ok) {
      setLinks((prev) => prev.filter((x) => x.shortcode !== id));
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user.name}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New link
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      <StatsCards
        total={links.length}
        active={activeLinks.length}
        clicks={totalClicks}
        hitRate={cacheHitRate}
      />

      <div className="rounded-xl border border-border bg-background">
        <div className="flex border-b border-border">
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
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t.toUpperCase()}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Auto-refresh every 30s</span>
            <span key={tick}>tick {tick}</span>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {tab === "active" ? "No active links - create one above" : "No expired links"}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((link) => (
                <LinkRow
                  key={link.shortcode}
                  link={link}
                  onDelete={handleDelete}
                  baseUrl={BASE_URL}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
