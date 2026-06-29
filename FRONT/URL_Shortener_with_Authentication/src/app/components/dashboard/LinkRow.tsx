import { Clock, ExternalLink, Trash2, XCircle } from "lucide-react";
import type { ShortLink } from "../../lib/types";
import { formatDate, formatTTL } from "../../lib/utils";
import CopyButton from "./CopyButton";
import RedisBadge from "./RedisBadge";

export default function LinkRow({
  link,
  onDelete,
  baseUrl,
}: {
  link: ShortLink;
  onDelete: (id: string) => void;
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