import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/event-card";
import { PageHeader } from "@/components/page-header";
import type { EventWithOrg } from "@/lib/types";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const { q, past } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const showPast = past === "1";

  const supabase = await createClient();
  let request = supabase
    .from("events")
    .select("*, organizations(id, name)")
    .eq("is_published", true)
    .order("starts_at", { ascending: !showPast })
    .limit(60);
  const now = new Date().toISOString();
  request = showPast ? request.lt("ends_at", now) : request.gte("ends_at", now);
  if (query) request = request.ilike("title", `%${query.replace(/[%_,()]/g, "")}%`);

  const { data } = await request;
  const events = (data ?? []) as EventWithOrg[];

  return (
    <div className="container-page py-10">
      <PageHeader title="Events" subtitle="Find an event and grab your QR ticket." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="flex flex-1 gap-2" action="/events">
          {showPast && <input type="hidden" name="past" value="1" />}
          <input name="q" defaultValue={query} placeholder="Search events…" className="input max-w-sm" />
          <button className="btn-secondary">Search</button>
        </form>
        <div className="flex rounded-xl border border-stone-300 bg-white p-1 text-sm">
          <Link
            href={query ? `/events?q=${encodeURIComponent(query)}` : "/events"}
            className={`rounded-lg px-3 py-1.5 ${!showPast ? "bg-brand-700 text-white" : "text-stone-600"}`}
          >
            Upcoming
          </Link>
          <Link
            href={`/events?past=1${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={`rounded-lg px-3 py-1.5 ${showPast ? "bg-brand-700 text-white" : "text-stone-600"}`}
          >
            Past
          </Link>
        </div>
      </div>

      {events.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-sm text-stone-600">
          {query ? `No events match “${query}”.` : showPast ? "No past events." : "No upcoming events yet."}
        </p>
      )}
    </div>
  );
}
