import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/event-card";
import { PageHeader } from "@/components/page-header";
import { NavSearch, NavTabs, PendingArea, PendingNavProvider } from "@/components/pending-nav";
import { EventGridSkeleton } from "@/components/skeletons";
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

  const base = (past: boolean) => {
    const params = new URLSearchParams();
    if (past) params.set("past", "1");
    if (query) params.set("q", query);
    const s = params.toString();
    return s ? `/events?${s}` : "/events";
  };

  return (
    <div className="container-page py-10">
      <PageHeader title="Events" subtitle="Find an event and grab your QR ticket." />

      <PendingNavProvider>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <NavSearch
            action="/events"
            defaultValue={query}
            placeholder="Search events…"
            keep={{ past: showPast ? "1" : undefined }}
          />
          <NavTabs
            activeHref={base(showPast)}
            tabs={[
              { href: base(false), label: "Upcoming" },
              { href: base(true), label: "Past" },
            ]}
          />
        </div>

        <PendingArea fallback={<EventGridSkeleton count={6} />}>
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
        </PendingArea>
      </PendingNavProvider>
    </div>
  );
}
