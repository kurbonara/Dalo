export default function Loading() {
  return (
    <div className="container-page max-w-md py-12" aria-busy="true">
      <div className="mx-auto mb-2 h-3 w-32 animate-pulse rounded bg-stone-200" />
      <div className="mx-auto mb-6 h-7 w-56 animate-pulse rounded-lg bg-stone-200" />
      <div className="card flex flex-col items-center gap-4 p-10">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" />
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
      </div>
    </div>
  );
}
