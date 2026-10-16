export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "brand" }) {
  return (
    <div className={`card p-4 ${tone === "brand" ? "border-brand-200 bg-brand-50" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone === "brand" ? "text-brand-800" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
