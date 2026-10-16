type Params = Record<string, string | string[] | undefined>;

export function Flash({ params }: { params: Params }) {
  const error = typeof params.error === "string" ? params.error : null;
  const message = typeof params.message === "string" ? params.message : null;
  if (!error && !message) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-800" : "border-brand-200 bg-brand-50 text-brand-900"
      }`}
    >
      {error ?? message}
    </div>
  );
}
