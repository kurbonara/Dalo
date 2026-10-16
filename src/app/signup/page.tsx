import type { Metadata } from "next";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Create your Dalo account</h1>
        <p className="mb-6 text-stone-600">One account for all your org events, tickets and certificates.</p>
        <Flash params={params} />
        <form action={signUp} className="card space-y-4 p-6">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input className="input" id="full_name" name="full_name" autoComplete="name" required />
            <p className="hint">Exactly as it should appear on your certificates.</p>
          </div>
          <div>
            <label className="label" htmlFor="student_no">Student number <span className="text-stone-400">(optional)</span></label>
            <input className="input" id="student_no" name="student_no" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
            <p className="hint">At least 8 characters.</p>
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Creating account…">
            Create account
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
