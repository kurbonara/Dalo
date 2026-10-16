import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import type { DaloEvent, OrgRole } from "@/lib/types";

export type StaffEvent = DaloEvent & { organizations: { id: string; name: string } };

/** Loads an event the current user can manage, or 404s. */
export async function requireEventStaff(eventId: string, next: string) {
  const session = await requireSession(next);
  const supabase = await createClient();

  // Fetch the event and the user's memberships in parallel rather than one after another.
  const [{ data: event }, { data: memberships }] = await Promise.all([
    supabase.from("events").select("*, organizations(id, name)").eq("id", eventId).maybeSingle<StaffEvent>(),
    supabase.from("org_members").select("org_id, role").eq("user_id", session.id),
  ]);
  const member = memberships?.find((m) => m.org_id === event?.org_id);
  if (!event || !member) notFound();

  return { event, role: member.role as OrgRole, supabase };
}
