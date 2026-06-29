import { useState } from "react";
import { Zap } from "lucide-react";
import type { ShortLink } from "../../lib/types";
import { generateShortcode } from "../../lib/utils";
import { apiCreateLink } from "../../lib/api";

const TTL_PRESETS = [
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "1 day", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
];

export default function CreateModal({
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
  const [ttl, setTtl] = useState(3600);
  const [useCustom, setUseCustom] = useState(false);
  const [customSeconds, setCustomSeconds] = useState("3600");
  const [warmCache, setWarmCache] = useState(true);
  const [errors, setErrors] = useState<{ url?: string; shortcode?: string; ttl?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveTtl = useCustom ? Number(customSeconds) : ttl;

  const validate = () => {
    const e: { url?: string; shortcode?: string; ttl?: string } = {};
    try {
      new URL(url);
    } catch {
      e.url = "Invalid URL";
    }
    if (!/^[a-z0-9_-]{2,32}$/.test(shortcode)) {
      e.shortcode = "2–32 chars, lowercase letters, digits, - or _";
    }
    if (!Number.isInteger(effectiveTtl) || effectiveTtl < 60) {
      e.ttl = "TTL must be at least 60 seconds";
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
      const expiresAt = new Date(Date.now() + effectiveTtl * 1000).toISOString();
      const res = await apiCreateLink({
        original_url: url,
        custom_alias: shortcode,
        expires_at: expiresAt,
      });

      if (!res.ok) return;

      onCreate({
        shortcode,
        originalUrl: url,
        createdAt: Date.now(),
        expiresAt: Date.now() + effectiveTtl * 1000,
        clicks: 0,
        userId: "u1",
        cachedInRedis: warmCache,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="h-4 w-4" />
              Create short link
            </div>
            <h2 className="mt-2 text-2xl font-bold">New redirect</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Destination URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very/long/path"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Shortcode</label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                {baseUrl}/
              </span>
              <input
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value.toLowerCase())}
                className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShortcode(generateShortcode())}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Regenerate
              </button>
            </div>
            {errors.shortcode && <p className="mt-1 text-sm text-red-500">{errors.shortcode}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">TTL</label>
            <div className="flex flex-wrap gap-2">
              {TTL_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setTtl(p.value);
                    setUseCustom(false);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    !useCustom && ttl === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  useCustom ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                Custom
              </button>
            </div>

            {useCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={60}
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  className="w-28 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
            )}

            {errors.ttl && <p className="mt-1 text-sm text-red-500">{errors.ttl}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}