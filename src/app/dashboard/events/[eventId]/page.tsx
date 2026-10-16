import Link from "next/link";
import { requireEventStaff } from "@/lib/staff";
import { attendanceStats } from "@/lib/stats";
import { SITE_URL, eventPhase, formatDateTime, formatRange } from "@/lib/format";
import { deleteEvent, setRegistrationOpen } from "@/app/actions/events";
import { AutoRefresh } from "@/components/auto-refresh";
import { PhaseBadge } from "@/components/badges";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { SubmitButton } from "@/components/submit-button";
import type { AttendanceRow } from "@/lib/types";

type Log = {
  id: number;
  action: string;
  note: string | null;
  scanned_at: string;
  registrations: { profiles: { full_name: string } | null } | null;
  scanner: { full_name: string } | null;
};

const actionLabel: Record<string, string> = {
  check_in: "Checked in",
  check_out: "Checked out",
  rejected: "Rejected",
  reset: "Reset",
};

export default async function ManageEventPage({ params, searchParams }: PageProps<"/dashboard/events/[eventId]">) {
  const { eventId } = await params;
  const { event, supabase } = await requireEventStaff(eventId, `/dashboard/events/${eventId}`);
  const flash = await searchParams;

  const [{ data: rows }, { data: logData }] = await Promise.all([
    supabase.from("attendance_report").select("*").eq("event_id", eventId),
    supabase
      .from("scan_logs")
      .select("id, action, note, scanned_at, registrations(profiles(full_name)), scanner:profiles!scan_logs_scanned_by_fkey(full_name)")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(15),
  ]);
  const stats = attendanceStats((rows ?? []) as AttendanceRow[]);
  const logs = (logData ?? []) as unknown as Log[];
  const phase = eventPhase(event.starts_at, event.ends_at);
  const publicUrl = `${SITE_URL}/events/${eventId}`;

  return (
    <div className="container-page py-10">
      {phase === "live" && <AutoRefresh seconds={20} />}
      <PageHeader
        title={event.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <PhaseBadge startsAt={event.starts_at} endsAt={event.ends_at} />
            {!event.is_published && <span className="badge bg-stone-800 text-white">Draft</span>}
            <span>{formatRange(event.starts_at, event.ends_at)}</span>
            {event.venue && <span>· {event.venue}</span>}
          </span>
        }
        back={{ href: `/dashboard/orgs/${event.org_id}`, label: event.organizations.name }}
        actions={
          <>
            <Link href={`/dashboard/events/${eventId}/scan`} className="btn-primary">
              Open scanner
            </Link>
            {event.self_checkin_enabled && (
              <Link href={`/dashboard/events/${eventId}/checkin-screen`} className="btn-secondary">
                Self check-in screen
              </Link>
            )}
            <Link href={`/dashboard/events/${eventId}/report`} className="btn-secondary">
              Attendance report
            </Link>
            <Link href={`/dashboard/events/${eventId}/edit`} className="btn-secondary">
              Edit
            </Link>
          </>
        }
      />
      <Flash params={flash} />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Registered" value={stats.registered} hint={event.capacity ? `of ${event.capacity} slots` : "no limit"} />
        <Stat label="Checked in" value={stats.checkedIn} hint={`${stats.turnout}% turnout`} />
        <Stat label="Inside now" value={stats.stillInside} />
        <Stat label="Checked out" value={stats.checkedOut} />
        <Stat label="Certificates" value={stats.completed} tone="brand" hint="completed attendance" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent scans</h2>
            <Link href={`/dashboard/events/${eventId}/report`} className="text-sm font-semibold text-brand-700 hover:underline">
              Full report →
            </Link>
          </div>
          {logs.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span
                    className={`badge ${
                      log.action === "check_in"
                        ? "bg-amber-100 text-amber-800"
                        : log.action === "check_out"
                          ? "bg-brand-100 text-brand-800"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {actionLabel[log.action] ?? log.action}
                  </span>
                  <span className="font-medium">{log.registrations?.profiles?.full_name ?? log.note ?? "Unknown ticket"}</span>
                  <span className="ml-auto text-xs text-stone-500">
                    {formatDateTime(log.scanned_at)}
                    {log.scanner ? ` · by ${log.scanner.full_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">No scans yet. Open the scanner on a phone at the entrance.</p>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card space-y-3 p-6">
            <h2 className="font-semibold">Share registration link</h2>
            <p className="break-all rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600">{publicUrl}</p>
            <div className="flex gap-2">
              <CopyButton text={publicUrl} />
              <Link href={`/events/${eventId}`} className="btn-ghost">
                View page
              </Link>
            </div>
          </div>

          <form action={setRegistrationOpen.bind(null, eventId, !event.registration_open)} className="card p-6">
            <h2 className="font-semibold">Registration is {event.registration_open ? "open" : "closed"}</h2>
            <p className="mb-3 mt-1 text-sm text-stone-600">
              {event.registration_open ? "Members can currently register." : "No new registrations are accepted."}
            </p>
            <SubmitButton className="btn-secondary" pendingText="Saving…">
              {event.registration_open ? "Close registration" : "Reopen registration"}
            </SubmitButton>
          </form>

          <form action={deleteEvent.bind(null, eventId, event.org_id)} className="card p-6">
            <h2 className="font-semibold text-red-800">Delete event</h2>
            <p className="mb-3 mt-1 text-sm text-stone-600">Removes all tickets and attendance records for this event.</p>
            <SubmitButton
              className="btn-danger"
              confirm="Delete this event and all of its attendance records? This cannot be undone."
              pendingText="Deleting…"
            >
              Delete event
            </SubmitButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
