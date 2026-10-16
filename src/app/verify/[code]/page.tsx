import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Certificate verification" };

type Result = {
  full_name: string;
  event_title: string;
  org_name: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  completed: boolean;
};

export default async function VerifyCodePage({ params }: PageProps<"/verify/[code]">) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: code });
  const result = ((data ?? []) as Result[])[0];
  const valid = result?.completed;

  return (
    <div className="container-page max-w-lg py-16">
      <div className={`card overflow-hidden ${valid ? "border-brand-200" : "border-red-200"}`}>
        <div className={`px-6 py-5 ${valid ? "bg-brand-700 text-white" : "bg-red-50 text-red-800"}`}>
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Certificate No. {code.toUpperCase()}</p>
          <h1 className="mt-1 text-2xl font-bold">{valid ? "✓ Valid certificate" : "✗ Not a valid certificate"}</h1>
        </div>
        <div className="p-6">
          {valid ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-stone-500">Awarded to</dt>
                <dd className="text-lg font-semibold">{result.full_name}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Event</dt>
                <dd className="font-semibold">{result.event_title}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Organized by</dt>
                <dd>{result.org_name}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Date</dt>
                <dd>
                  {formatLongDate(result.starts_at)}
                  {result.venue ? ` · ${result.venue}` : ""}
                </dd>
              </div>
              <p className="pt-2 text-xs text-stone-500">
                Attendance was recorded by QR scan-in and scan-out by the organization&apos;s officers.
              </p>
            </dl>
          ) : (
            <p className="text-sm text-stone-600">
              {result
                ? "This certificate number exists, but the attendee has not completed the event's attendance requirements."
                : "No certificate with this number was issued through Dalo. Check the number and try again."}
            </p>
          )}
          <Link href="/verify" className="btn-secondary mt-6">
            Verify another
          </Link>
        </div>
      </div>
    </div>
  );
}
