import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getSession } from "@/lib/auth";
import { eventPhase, formatRange } from "@/lib/format";
import { Flash } from "@/components/flash";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { RefreshAtTimes } from "@/components/refresh-at-times";
import { PhaseBadge, AttendanceBadge } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { registerForEvent, cancelRegistration } from "@/app/actions/registrations";
import type { EventWithOrg, Registration } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Event" };
}

export default async function EventPage({ params, searchParams }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const flash = await searchParams;
  const supabase = await createClient();

  const session = await getSession();
  const [{ data: event }, user, registrationResult, membershipResult] = await Promise.all([
    supabase.from("events").select("*, organizations(id, name)").eq("id", id).maybeSingle<EventWithOrg>(),
    getCurrentUser(),
    session
      ? supabase.from("registrations").select("*").eq("event_id", id).eq("user_id", session.id).maybeSingle<Registration>()
      : Promise.resolve({ data: null }),
    session
      ? supabase.from("org_members").select("org_id").eq("user_id", session.id)
      : Promise.resolve({ data: [] as { org_id: string }[] }),
  ]);
  if (!event) notFound();
  const role = (membershipResult.data ?? []).some((m) => m.org_id === event.org_id);
  const registration = registrationResult.data as Registration | null;
  const registered = registration?.status === "registered";
  const taken = event.registered_count ?? 0;
  const full = event.capacity !== null && taken >= event.capacity;
  const phase = eventPhase(event.starts_at, event.ends_at);

  const register = registerForEvent.bind(null, id);
  const cancel = cancelRegistration.bind(null, id);

  return (
    <div className="container-page max-w-4xl py-10">
      <Link href="/events" className="mb-3 inline-block text-sm text-stone-500 hover:text-ink">
        ← All events
      </Link>
      <Flash params={flash} />
      <RefreshAtTimes times={[event.starts_at, event.ends_at]} />
      <RealtimeRefresh
        subscriptions={[
          { table: "events", filter: `id=eq.${id}` },
          { table: "registrations", filter: `event_id=eq.${id}` },
        ]}
      />

      <div className="card overflow-hidden">
        <div className="bg-brand-800 px-6 py-8 text-white sm:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PhaseBadge startsAt={event.starts_at} endsAt={event.ends_at} />
            {!event.is_published && <span className="badge bg-white/20 text-white">Draft</span>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-brand-100">by {event.organizations?.name}</p>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
          <div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-stone-500">When</dt>
                <dd className="mt-0.5">{formatRange(event.starts_at, event.ends_at)}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-500">Where</dt>
                <dd className="mt-0.5">{event.venue || "To be announced"}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-500">Slots</dt>
                <dd className="mt-0.5">
                  {event.capacity ? `${taken} / ${event.capacity} registered` : `${taken} registered · no limit`}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-stone-500">Certificate</dt>
                <dd className="mt-0.5">
                  {event.require_checkout ? "Scan in and out" : "Scan in"}
                  {event.min_attendance_minutes > 0 ? `, stay ≥ ${event.min_attendance_minutes} min` : ""}
                </dd>
              </div>
            </dl>
            {event.description && (
              <div className="mt-8 border-t border-stone-200 pt-6">
                <h2 className="mb-2 font-semibold">About this event</h2>
                <p className="whitespace-pre-line text-stone-700">{event.description}</p>
              </div>
            )}
          </div>

          <aside className="rounded-2xl bg-stone-50 p-5">
            {registered && registration ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Your ticket</span>
                  <AttendanceBadge
                    status={registration.status}
                    checkedInAt={registration.checked_in_at}
                    checkedOutAt={registration.checked_out_at}
                  />
                </div>
                <Link href={`/tickets/${registration.id}`} className="btn-primary w-full">
                  Show QR ticket
                </Link>
                {!registration.checked_in_at && phase !== "ended" && (
                  <form action={cancel} className="mt-2">
                    <SubmitButton
                      className="btn-ghost w-full text-red-700"
                      confirm="Cancel your registration for this event?"
                      pendingText="Cancelling…"
                    >
                      Cancel registration
                    </SubmitButton>
                  </form>
                )}
              </>
            ) : phase === "ended" ? (
              <p className="text-sm text-stone-600">This event has ended.</p>
            ) : !event.registration_open ? (
              <p className="text-sm text-stone-600">Registration is closed.</p>
            ) : full ? (
              <p className="text-sm text-stone-600">This event is full.</p>
            ) : user ? (
              <form action={register}>
                <p className="mb-3 text-sm text-stone-600">
                  Registering as <strong>{user.full_name || user.email}</strong>
                </p>
                <SubmitButton className="btn-primary w-full" pendingText="Registering…">
                  Register &amp; get ticket
                </SubmitButton>
              </form>
            ) : (
              <>
                <p className="mb-3 text-sm text-stone-600">Sign in to register and get your QR ticket.</p>
                <Link href={`/login?next=/events/${id}`} className="btn-primary w-full">
                  Sign in to register
                </Link>
                <Link href={`/signup?next=/events/${id}`} className="btn-ghost mt-2 w-full">
                  Create an account
                </Link>
              </>
            )}

            {role && (
              <Link href={`/dashboard/events/${id}`} className="btn-secondary mt-4 w-full">
                Manage event
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
