import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-stone-600">Sign in to see your tickets and manage events.</p>
        <Flash params={params} />
        <form action={signIn} className="card space-y-4 p-6">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">
          New to Dalo?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
