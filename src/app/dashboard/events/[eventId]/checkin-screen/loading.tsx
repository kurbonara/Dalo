export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-brand-900 py-16" aria-busy="true">
      <div className="h-3 w-32 animate-pulse rounded bg-white/20" />
      <div className="mt-3 h-9 w-80 max-w-[80%] animate-pulse rounded-lg bg-white/20" />
      <div className="mt-5 h-9 w-52 animate-pulse rounded-full bg-amber-300/40" />
      <div className="mt-6 aspect-square w-[min(80vw,420px)] animate-pulse rounded-3xl bg-white/90" />
    </div>
  );
}
