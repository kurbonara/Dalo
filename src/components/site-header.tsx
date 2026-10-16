import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  const links = [
    { href: "/events", label: "Events" },
    ...(user
      ? [
          { href: "/tickets", label: "My tickets" },
          { href: "/dashboard", label: "Organizer" },
        ]
      : []),
    { href: "/verify", label: "Verify" },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-2">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight">
          <Logo />
          <span className="text-lg">Dalo</span>
        </Link>

        {/* Wide screens: inline navigation */}
        <nav className="hidden flex-1 items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="btn-ghost px-3 py-2">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <Link
                href="/account"
                className="btn-ghost max-w-40 truncate px-3 py-2"
                title={user.email ?? ""}
              >
                {user.full_name || user.email}
              </Link>
              <form action={signOut}>
                <button className="btn-secondary px-3 py-2">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost px-3 py-2">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary px-3 py-2">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Phones: compact header with a menu */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {!user && (
            <Link href="/signup" className="btn-primary px-3 py-2">
              Sign up
            </Link>
          )}
          <MobileMenu>
            {user && (
              <div className="mb-1 border-b border-stone-100 px-3 pb-2 pt-1">
                <p className="truncate font-semibold">{user.full_name || "Your account"}</p>
                <p className="truncate text-xs text-stone-500">{user.email}</p>
              </div>
            )}
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="btn-ghost px-3 py-2.5">
                {link.label}
              </Link>
            ))}
            <div className="my-1 border-t border-stone-100" />
            {user ? (
              <>
                <Link href="/account" className="btn-ghost px-3 py-2.5">
                  Account
                </Link>
                <form action={signOut}>
                  <button className="btn-ghost px-3 py-2.5 text-red-700">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn-ghost px-3 py-2.5">
                Sign in
              </Link>
            )}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
