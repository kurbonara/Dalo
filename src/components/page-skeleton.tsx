export function PageSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "table" }) {
  const bar = "animate-pulse rounded-lg bg-stone-200/80";
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className={`${bar} mb-3 h-4 w-24`} />
      <div className={`${bar} mb-2 h-8 w-72 max-w-full`} />
      <div className={`${bar} mb-8 h-4 w-96 max-w-full`} />

      {variant === "table" ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card h-24 animate-pulse" />
            ))}
          </div>
          <div className="card space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${bar} h-6`} />
            ))}
          </div>
        </>
      ) : variant === "detail" ? (
        <div className="card overflow-hidden">
          <div className="h-36 animate-pulse bg-brand-800/80" />
          <div className="space-y-3 p-6">
            <div className={`${bar} h-4 w-1/2`} />
            <div className={`${bar} h-4 w-2/3`} />
            <div className={`${bar} h-4 w-1/3`} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex gap-4 p-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-brand-50" />
              <div className="flex-1 space-y-2 pt-1">
                <div className={`${bar} h-4 w-3/4`} />
                <div className={`${bar} h-3 w-1/2`} />
                <div className={`${bar} h-3 w-2/3`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
