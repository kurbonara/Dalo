import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-stone-600">
        It may have been removed, or you may not have access to it.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
