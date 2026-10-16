import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/event-card";
import { EventGridSkeleton } from "@/components/skeletons";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { RefreshAtTimes } from "@/components/refresh-at-times";
import type { EventWithOrg } from "@/lib/types";

const steps = [
  {
    title: "Register online",
    body: "Members sign up for your event in seconds. Capacity limits are enforced automatically.",
  },
  {
    title: "Get a QR ticket",
    body: "Each attendee gets a unique, unguessable QR ticket tied to their account. No more signing for a friend.",
  },
  {
    title: "Scan in & out",
    body: "Officers scan tickets from any phone. Check-in and check-out are timestamped and logged.",
  },
  {
    title: "Reports & e-certificates",
    body: "Attendance tallies itself. Everyone who completed the event downloads a verifiable certificate.",
  },
];

export default function Home() {
  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "events" }]} />
      <section className="border-b border-stone-200 bg-white">
        <div className="container-page grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              For student organizations
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Attendance you can trust, certificates that make themselves.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600">
              Dalo replaces paper sign-in sheets and Google Forms with QR tickets, scan-in/scan-out, automatic
              reports, and e-certificates for everyone who actually stayed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/events" className="btn-primary px-5 py-3">
                Browse events
              </Link>
              <Link href="/dashboard" className="btn-secondary px-5 py-3">
                Run an event
              </Link>
            </div>
          </div>
          <div className="card relative mx-auto w-full max-w-sm overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-2 bg-brand-700" />
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Event ticket</p>
            <p className="mt-1 text-lg font-bold">General Assembly 2026</p>
            <p className="text-sm text-stone-600">Computer Science Society</p>
            <div className="my-5 grid grid-cols-8 gap-1 rounded-xl bg-stone-50 p-4" aria-hidden="true">
              {Array.from({ length: 64 }).map((_, i) => (
                <span
                  key={i}
                  className={`aspect-square rounded-[2px] ${
                    (i * 7 + (i % 5) * 3) % 3 === 0 || [0, 1, 8, 9, 6, 7, 14, 15, 48, 49, 56, 57].includes(i)
                      ? "bg-ink"
                      : "bg-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="badge bg-brand-100 text-brand-800">Checked in · 9:02 AM</span>
              <span className="font-mono text-xs text-stone-500">#A4F2…9C</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming events</h2>
          <Link href="/events" className="text-sm font-semibold text-brand-700 hover:underline">
            See all →
          </Link>
        </div>
        <Suspense fallback={<EventGridSkeleton count={4} />}>
          <UpcomingEvents />
        </Suspense>
      </section>
    </>
  );
}

async function UpcomingEvents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, organizations(id, name)")
    .eq("is_published", true)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(4);
  const events = (data ?? []) as EventWithOrg[];

  return (
    <>
      <RefreshAtTimes times={events.flatMap((e) => [e.starts_at, e.ends_at])} />
      {events.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-sm text-stone-600">No upcoming events yet. Check back soon!</p>
      )}
    </>
  );
}
