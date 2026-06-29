export default function StatsCards({
  total,
  active,
  clicks,
  hitRate,
}: {
  total: number;
  active: number;
  clicks: number;
  hitRate: number;
}) {
  const cards = [
    { label: "TOTAL LINKS", value: total.toString() },
    { label: "ACTIVE", value: active.toString(), accent: true },
    { label: "TOTAL CLICKS", value: clicks.toLocaleString() },
    { label: "REDIS HIT RATE", value: `${hitRate}%`, accent: hitRate > 50 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8 border border-border rounded-sm overflow-hidden">
      {cards.map((s) => (
        <div key={s.label} className="bg-card px-5 py-4">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">{s.label}</p>
          <p className={`font-mono font-bold text-2xl ${s.accent ? "text-primary" : "text-foreground"}`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}