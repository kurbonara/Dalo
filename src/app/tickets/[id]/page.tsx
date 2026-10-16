import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { eventPhase, formatDateTime, formatRange } from "@/lib/format";
import { AttendanceBadge } from "@/components/badges";
import { AutoRefresh } from "@/components/auto-refresh";
import { CertificateButton } from "@/components/certificate-button";
import { Flash } from "@/components/flash";
import type { DaloEvent, Registration } from "@/lib/types";

export const metadata: Metadata = { title: "Ticket" };

type Row = Registration & {
  events: (DaloEvent & { organizations: { name: string } | null }) | null;
};

export default async function TicketPage({ params, searchParams }: PageProps<"/tickets/[id]">) {
  const { id } = await params;
  const session = await requireSession(`/tickets/${id}`);
  const flash = await searchParams;
  const supabase = await createClient();

  const [user, { data }, { data: report }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("registrations")
      .select("*, events(*, organizations(name))")
      .eq("id", id)
      .eq("user_id", session.id)
      .maybeSingle<Row>(),
    supabase.from("attendance_report").select("completed, minutes_attended").eq("registration_id", id).maybeSingle(),
  ]);
  if (!data?.events || !user) notFound();
  const reg = data;
  const event = data.events;
  const completed = Boolean(report?.completed);
  const phase = eventPhase(event.starts_at, event.ends_at);
  const cancelled = reg.status === "cancelled";

  const qrSvg = await QRCode.toString(reg.ticket_code, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#13201d", light: "#ffffff" },
  });

  const needs: string[] = [];
  if (!reg.checked_in_at) needs.push("scan in at the entrance");
  if (event.require_checkout && !reg.checked_out_at) needs.push("scan out when you leave");
  if (event.min_attendance_minutes > 0) needs.push(`stay at least ${event.min_attendance_minutes} minutes`);

  return (
    <div className="container-page max-w-lg py-10">
      {phase !== "ended" && !cancelled && <AutoRefresh seconds={10} />}
      <Link href="/tickets" className="mb-3 inline-block text-sm text-stone-500 hover:text-ink">
        ← My tickets
      </Link>
      <Flash params={flash} />

      <div className="card overflow-hidden">
        <div className="bg-brand-800 px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">{event.organizations?.name}</p>
          <h1 className="mt-1 text-xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-brand-100">{formatRange(event.starts_at, event.ends_at)}</p>
          {event.venue && <p className="text-sm text-brand-100">{event.venue}</p>}
        </div>

        <div className="relative border-b border-dashed border-stone-300 p-6">
          {cancelled ? (
            <p className="py-16 text-center text-stone-500">This registration was cancelled.</p>
          ) : (
            <>
              <div
                className="mx-auto aspect-square w-full max-w-72 [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="mt-3 text-center font-mono text-xs tracking-wider text-stone-500">
                {reg.ticket_code.slice(0, 4).toUpperCase()}…{reg.ticket_code.slice(-4).toUpperCase()}
              </p>
            </>
          )}
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{user.full_name}</p>
              {user.student_no && <p className="text-sm text-stone-500">{user.student_no}</p>}
            </div>
            <AttendanceBadge status={reg.status} checkedInAt={reg.checked_in_at} checkedOutAt={reg.checked_out_at} completed={completed} />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 p-3">
              <dt className="text-stone-500">Checked in</dt>
              <dd className="font-semibold">{formatDateTime(reg.checked_in_at)}</dd>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <dt className="text-stone-500">Checked out</dt>
              <dd className="font-semibold">{formatDateTime(reg.checked_out_at)}</dd>
            </div>
          </dl>

          {completed ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-sm text-amber-900">
                You completed this event. Your e-certificate is ready.
              </p>
              <CertificateButton
                filename={`certificate-${reg.certificate_code}.pdf`}
                certificates={[
                  {
                    fullName: user.full_name,
                    eventTitle: event.title,
                    orgName: event.organizations?.name ?? "",
                    startsAt: event.starts_at,
                    endsAt: event.ends_at,
                    venue: event.venue,
                    signatory: event.certificate_signatory,
                    signatoryTitle: event.certificate_signatory_title,
                    certificateCode: reg.certificate_code,
                  },
                ]}
              />
            </div>
          ) : (
            !cancelled && (
              <p className="text-sm text-stone-600">
                {needs.length
                  ? `To earn your certificate: ${needs.join(", ")}.`
                  : "Your certificate unlocks once the event ends."}
              </p>
            )
          )}
        </div>
      </div>
      {!cancelled && phase !== "ended" && (
        <p className="mt-4 text-center text-xs text-stone-500">
          Show this QR code to an officer. Don&apos;t share it, since it&apos;s tied to your account.
        </p>
      )}
    </div>
  );
}
