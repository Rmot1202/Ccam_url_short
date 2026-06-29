import { Zap } from "lucide-react";

export default function RedisBadge({ cached }: { cached: boolean }) {
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