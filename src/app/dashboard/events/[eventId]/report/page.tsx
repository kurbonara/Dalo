import type { Metadata } from "next";
import { requireEventStaff } from "@/lib/staff";
import { attendanceStats } from "@/lib/stats";
import { TIMEZONE, eventPhase, formatDateTime, formatRange, slug } from "@/lib/format";
import { resetAttendance } from "@/app/actions/events";
import { AttendanceBadge } from "@/components/badges";
import { AutoRefresh } from "@/components/auto-refresh";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { NavSearch, NavTabs, PendingArea, PendingNavProvider } from "@/components/pending-nav";
import { ReportTableSkeleton } from "@/components/skeletons";
import { Stat } from "@/components/stat";
import { SubmitButton } from "@/components/submit-button";
import type { AttendanceRow, CertificateData } from "@/lib/types";
import { ReportTools } from "./report-tools";

export const metadata: Metadata = { title: "Attendance report" };

const FILTERS = {
  all: "All",
  completed: "Completed",
  inside: "Still inside",
  noshow: "No-shows",
  cancelled: "Cancelled",
} as const;
type Filter = keyof typeof FILTERS;

function matches(row: AttendanceRow, filter: Filter) {
  switch (filter) {
    case "completed":
      return row.completed;
    case "inside":
      return row.status === "registered" && Boolean(row.checked_in_at) && !row.checked_out_at;
    case "noshow":
      return row.status === "registered" && !row.checked_in_at;
    case "cancelled":
      return row.status === "cancelled";
    default:
      return true;
  }
}

export default async function ReportPage({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/report">) {
  const { eventId } = await params;
  const { event, supabase } = await requireEventStaff(eventId, `/dashboard/events/${eventId}/report`);
  const query = await searchParams;
  const filter: Filter = typeof query.filter === "string" && query.filter in FILTERS ? (query.filter as Filter) : "all";
  const search = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

  const { data } = await supabase
    .from("attendance_report")
    .select("*")
    .eq("event_id", eventId)
    .order("full_name");
  const all = (data ?? []) as AttendanceRow[];
  const stats = attendanceStats(all);
  const rows = all.filter(
    (r) =>
      matches(r, filter) &&
      (!search ||
        r.full_name.toLowerCase().includes(search) ||
        (r.student_no ?? "").toLowerCase().includes(search) ||
        (r.email ?? "").toLowerCase().includes(search)),
  );

  const certificates: CertificateData[] = all
    .filter((r) => r.completed)
    .map((r) => ({
      fullName: r.full_name,
      eventTitle: event.title,
      orgName: event.organizations.name,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      venue: event.venue,
      signatory: event.certificate_signatory,
      signatoryTitle: event.certificate_signatory_title,
      certificateCode: r.certificate_code,
    }));

  const filterHref = (f: Filter) => {
    const p = new URLSearchParams();
    if (f !== "all") p.set("filter", f);
    if (search) p.set("q", search);
    const s = p.toString();
    return `/dashboard/events/${eventId}/report${s ? `?${s}` : ""}`;
  };

  return (
    <div className="container-page py-10">
      {eventPhase(event.starts_at, event.ends_at) === "live" && <AutoRefresh seconds={20} />}
      <PageHeader
        title="Attendance report"
        subtitle={
          <>
            <span className="font-medium text-ink">{event.title}</span> · {event.organizations.name} ·{" "}
            {formatRange(event.starts_at, event.ends_at)}
          </>
        }
        back={{ href: `/dashboard/events/${eventId}`, label: "Event" }}
        actions={<ReportTools rows={all} certificates={certificates} baseName={slug(event.title)} timeZone={TIMEZONE} />}
      />
      <Flash params={query} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Registered" value={stats.registered} hint={stats.cancelled ? `${stats.cancelled} cancelled` : undefined} />
        <Stat label="Attended" value={stats.checkedIn} hint={`${stats.turnout}% turnout`} />
        <Stat label="Checked out" value={stats.checkedOut} />
        <Stat label="No-shows" value={stats.noShows} />
        <Stat label="Completed" value={stats.completed} tone="brand" hint="eligible for certificate" />
      </div>

      <p className="mb-4 text-sm text-stone-600">
        Completion rule: scanned in
        {event.require_checkout ? " and out" : " (and the event has ended, or scanned out)"}
        {event.min_attendance_minutes > 0 ? `, with at least ${event.min_attendance_minutes} minutes attended` : ""}.
      </p>

      <PendingNavProvider>
        <div className="no-print mb-4 flex flex-wrap items-center gap-3">
          <NavTabs
            activeHref={filterHref(filter)}
            tabs={(Object.keys(FILTERS) as Filter[]).map((f) => ({ href: filterHref(f), label: FILTERS[f] }))}
          />
          <NavSearch
            action={`/dashboard/events/${eventId}/report`}
            defaultValue={search}
            placeholder="Search name, student no., email"
            keep={{ filter: filter !== "all" ? filter : undefined }}
          />
        </div>

        <PendingArea fallback={<ReportTableSkeleton rows={Math.min(Math.max(rows.length, 3), 10)} />}>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Attendee</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Checked in</th>
                  <th className="px-4 py-3 font-semibold">Checked out</th>
                  <th className="px-4 py-3 text-right font-semibold">Minutes</th>
                  <th className="px-4 py-3 font-semibold">Certificate</th>
                  <th className="no-print px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r, i) => (
                  <tr key={r.registration_id} className="align-top">
                    <td className="px-4 py-3 tabular-nums text-stone-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.full_name || "—"}</p>
                      <p className="text-xs text-stone-500">{[r.student_no, r.email].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AttendanceBadge status={r.status} checkedInAt={r.checked_in_at} checkedOutAt={r.checked_out_at} completed={r.completed} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDateTime(r.checked_in_at)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDateTime(r.checked_out_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.minutes_attended ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.completed ? r.certificate_code : "—"}</td>
                    <td className="no-print px-4 py-3 text-right">
                      {r.checked_in_at && (
                        <form action={resetAttendance.bind(null, eventId, r.registration_id)}>
                          <SubmitButton
                            className="btn-ghost px-2 py-1 text-xs"
                            confirm={`Clear ${r.full_name}'s check-in and check-out times?`}
                            pendingText="…"
                          >
                            Reset
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                      {all.length ? "No attendees match this filter." : "No one has registered yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PendingArea>
      </PendingNavProvider>
      <p className="mt-4 hidden text-xs text-stone-500 print:block">
        Generated by Dalo on {formatDateTime(new Date().toISOString())}
      </p>
    </div>
  );
}
