import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/app/actions/auth";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const params = await searchParams;

  return (
    <div className="container-page max-w-xl py-10">
      <PageHeader title="Your account" subtitle={user.email} />
      <Flash params={params} />
      <form action={updateProfile} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input className="input" id="full_name" name="full_name" defaultValue={user.full_name} required />
          <p className="hint">This is the name printed on your e-certificates.</p>
        </div>
        <div>
          <label className="label" htmlFor="student_no">Student number</label>
          <input className="input" id="student_no" name="student_no" defaultValue={user.student_no ?? ""} />
        </div>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </form>
    </div>
  );
}
