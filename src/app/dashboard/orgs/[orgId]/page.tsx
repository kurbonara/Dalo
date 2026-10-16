import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMember, deleteOrg, removeMember, updateOrg } from "@/app/actions/orgs";
import { EventCard } from "@/components/event-card";
import { Flash } from "@/components/flash";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { RefreshAtTimes } from "@/components/refresh-at-times";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import type { EventWithOrg, Organization, OrgRole } from "@/lib/types";

type Member = { user_id: string; role: OrgRole; profiles: { full_name: string; email: string | null } | null };

export default async function OrgPage({ params, searchParams }: PageProps<"/dashboard/orgs/[orgId]">) {
  const { orgId } = await params;
  const user = await requireSession(`/dashboard/orgs/${orgId}`);
  const flash = await searchParams;
  const supabase = await createClient();

  const [{ data: org }, { data: memberData }, { data: eventData }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).maybeSingle<Organization>(),
    supabase.from("org_members").select("user_id, role, profiles(full_name, email)").eq("org_id", orgId).order("created_at"),
    supabase
      .from("events")
      .select("*, organizations(id, name)")
      .eq("org_id", orgId)
      .order("starts_at", { ascending: false }),
  ]);
  const members = (memberData ?? []) as unknown as Member[];
  const me = members.find((m) => m.user_id === user.id);
  if (!org || !me) notFound();
  const isOwner = me.role === "owner";
  const events = (eventData ?? []) as EventWithOrg[];

  const update = updateOrg.bind(null, orgId);
  const add = addMember.bind(null, orgId);
  const remove = deleteOrg.bind(null, orgId);

  return (
    <div className="container-page py-10">
      <PageHeader
        title={org.name}
        subtitle={org.description}
        back={{ href: "/dashboard", label: "Dashboard" }}
        actions={
          <Link href={`/dashboard/orgs/${orgId}/events/new`} className="btn-primary">
            + New event
          </Link>
        }
      />
      <Flash params={flash} />
      <RealtimeRefresh subscriptions={[{ table: "events", filter: `org_id=eq.${orgId}` }]} />
      <RefreshAtTimes times={events.flatMap((e) => [e.starts_at, e.ends_at])} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Events</h2>
          {events.length ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="relative">
                  <EventCard event={{ ...event, organizations: null }} href={`/dashboard/events/${event.id}`} />
                  {!event.is_published && (
                    <span className="badge absolute right-3 top-3 bg-stone-800 text-white">Draft</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-sm text-stone-600">
              No events yet.{" "}
              <Link href={`/dashboard/orgs/${orgId}/events/new`} className="font-semibold text-brand-700 hover:underline">
                Create your first event
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Officers ({members.length})</h2>
            <ul className="divide-y divide-stone-100">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.profiles?.full_name || m.profiles?.email}
                      {m.user_id === user.id && <span className="text-stone-400"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-stone-500">{m.profiles?.email}</p>
                  </div>
                  <span className="badge bg-stone-100 capitalize text-stone-600">{m.role}</span>
                  {(isOwner || m.user_id === user.id) && (
                    <form action={removeMember.bind(null, orgId, m.user_id)}>
                      <SubmitButton
                        className="btn-ghost px-2 py-1 text-xs text-red-700"
                        confirm={m.user_id === user.id ? "Leave this organization?" : "Remove this officer?"}
                        pendingText="…"
                      >
                        {m.user_id === user.id ? "Leave" : "Remove"}
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {isOwner && (
              <form action={add} className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                <label className="label" htmlFor="member-email">Add an officer</label>
                <input className="input" id="member-email" name="email" type="email" placeholder="their Dalo account email" required />
                <div className="flex gap-2">
                  <select name="role" className="input" defaultValue="officer" aria-label="Role">
                    <option value="officer">Officer (manage events & scan)</option>
                    <option value="owner">Owner (also manage officers)</option>
                  </select>
                  <SubmitButton className="btn-secondary" pendingText="Adding…">Add</SubmitButton>
                </div>
              </form>
            )}
          </div>

          {isOwner && (
            <form action={update} className="card space-y-4 p-6">
              <h2 className="font-semibold">Organization settings</h2>
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input className="input" id="name" name="name" defaultValue={org.name} required />
              </div>
              <div>
                <label className="label" htmlFor="description">Description</label>
                <textarea className="input min-h-20" id="description" name="description" defaultValue={org.description ?? ""} />
              </div>
              <SubmitButton className="btn-secondary" pendingText="Saving…">Save</SubmitButton>
            </form>
          )}

          {isOwner && (
            <form action={remove} className="card p-6">
              <h2 className="font-semibold text-red-800">Danger zone</h2>
              <p className="mb-3 mt-1 text-sm text-stone-600">Deleting removes all events, tickets and attendance records.</p>
              <SubmitButton
                className="btn-danger"
                confirm={`Delete ${org.name} and ALL its events and attendance records? This cannot be undone.`}
                pendingText="Deleting…"
              >
                Delete organization
              </SubmitButton>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
