import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { eventPhase, formatRange } from "@/lib/format";
import { AttendanceBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { Flash } from "@/components/flash";
import type { DaloEvent, Registration } from "@/lib/types";

export const metadata: Metadata = { title: "My tickets" };

type Row = Registration & { events: (DaloEvent & { organizations: { name: string } | null }) | null };

export default async function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  const user = await requireSession("/tickets");
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data }, { data: completion }] = await Promise.all([
    supabase
      .from("registrations")
      .select("*, events(*, organizations(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("attendance_report").select("registration_id, completed").eq("user_id", user.id),
  ]);
  const completed = new Set((completion ?? []).filter((c) => c.completed).map((c) => c.registration_id));
  const rows = ((data ?? []) as Row[]).filter((r) => r.events);
  const active = rows.filter((r) => r.status === "registered" && eventPhase(r.events!.starts_at, r.events!.ends_at) !== "ended");
  const past = rows.filter((r) => !active.includes(r));

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader title="My tickets" subtitle="Your QR tickets and certificates." actions={<Link href="/events" className="btn-secondary">Find events</Link>} />
      <Flash params={params} />

      <Section title="Upcoming & ongoing" empty="No active tickets. Register for an event to get one.">
        {active.map((r) => (
          <TicketRow key={r.id} row={r} completed={completed.has(r.id)} />
        ))}
      </Section>
      <Section title="Past & cancelled" empty="Nothing here yet.">
        {past.map((r) => (
          <TicketRow key={r.id} row={r} completed={completed.has(r.id)} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">{title}</h2>
      {children.length ? <div className="space-y-3">{children}</div> : <p className="card p-5 text-sm text-stone-600">{empty}</p>}
    </section>
  );
}

function TicketRow({ row, completed }: { row: Row; completed: boolean }) {
  const event = row.events!;
  return (
    <Link href={`/tickets/${row.id}`} className="card flex flex-wrap items-center gap-4 p-4 transition hover:border-brand-200 hover:shadow-md">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{event.title}</p>
        <p className="text-sm text-stone-600">{event.organizations?.name}</p>
        <p className="mt-1 text-xs text-stone-500">{formatRange(event.starts_at, event.ends_at)}</p>
      </div>
      <div className="flex items-center gap-2">
        {completed && <span className="badge bg-amber-100 text-amber-800">Certificate ready</span>}
        <AttendanceBadge status={row.status} checkedInAt={row.checked_in_at} checkedOutAt={row.checked_out_at} completed={completed} />
      </div>
    </Link>
  );
}
