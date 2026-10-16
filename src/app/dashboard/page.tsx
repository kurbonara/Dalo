import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createOrg } from "@/app/actions/orgs";
import { EventCard } from "@/components/event-card";
import { Flash } from "@/components/flash";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import type { EventWithOrg, Organization, OrgRole } from "@/lib/types";

export const metadata: Metadata = { title: "Organizer" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireSession("/dashboard");
  const params = await searchParams;
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("org_members")
    .select("role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at");
  const orgs = (memberships ?? [])
    .map((m) => ({ role: m.role as OrgRole, org: m.organizations as unknown as Organization | null }))
    .filter((m): m is { role: OrgRole; org: Organization } => Boolean(m.org));

  const orgIds = orgs.map((o) => o.org.id);
  const { data: eventData } = orgIds.length
    ? await supabase
        .from("events")
        .select("*, organizations(id, name)")
        .in("org_id", orgIds)
        .gte("ends_at", new Date().toISOString())
        .order("starts_at")
        .limit(6)
    : { data: [] };
  const events = (eventData ?? []) as EventWithOrg[];

  return (
    <div className="container-page py-10">
      <PageHeader title="Organizer dashboard" subtitle="Manage your organizations, events and attendance." />
      <Flash params={params} />
      {orgIds.length > 0 && (
        <RealtimeRefresh subscriptions={[{ table: "events", filter: `org_id=in.(${orgIds.join(",")})` }]} />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Your organizations</h2>
            {orgs.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {orgs.map(({ org, role }) => (
                  <Link
                    key={org.id}
                    href={`/dashboard/orgs/${org.id}`}
                    className="card p-5 transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{org.name}</h3>
                      <span className="badge bg-stone-100 capitalize text-stone-600">{role}</span>
                    </div>
                    {org.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{org.description}</p>}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="card p-5 text-sm text-stone-600">
                You&apos;re not part of any organization yet. Create one, or ask an owner to add you as an officer using
                your email <strong>{user.email}</strong>.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Upcoming events you manage</h2>
            {events.length ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} href={`/dashboard/events/${event.id}`} />
                ))}
              </div>
            ) : (
              <p className="card p-5 text-sm text-stone-600">No upcoming events.</p>
            )}
          </section>
        </div>

        <aside>
          <form action={createOrg} className="card space-y-4 p-6">
            <h2 className="font-semibold">Create an organization</h2>
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input className="input" id="name" name="name" placeholder="e.g. Computer Science Society" required />
            </div>
            <div>
              <label className="label" htmlFor="description">Description</label>
              <textarea className="input min-h-20" id="description" name="description" />
            </div>
            <SubmitButton className="btn-primary w-full" pendingText="Creating…">
              Create organization
            </SubmitButton>
            <p className="hint">You&apos;ll be its owner and can add other officers.</p>
          </form>
        </aside>
      </div>
    </div>
  );
}
