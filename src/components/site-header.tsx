import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-2">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight">
          <Logo />
          <span className="text-lg">Dalo</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/events" className="btn-ghost px-3 py-2">
            Events
          </Link>
          {user && (
            <Link href="/tickets" className="btn-ghost px-3 py-2">
              My tickets
            </Link>
          )}
          <Link href="/dashboard" className="btn-ghost px-3 py-2">
            Organizer
          </Link>
          <Link href="/verify" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
            Verify
          </Link>
        </nav>
        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              className="btn-ghost hidden max-w-40 truncate px-3 py-2 md:inline-flex"
              title={user.email ?? ""}
            >
              {user.full_name || user.email}
            </Link>
            <form action={signOut}>
              <button className="btn-secondary px-3 py-2">Sign out</button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link href="/login" className="btn-ghost px-3 py-2">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary px-3 py-2">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
