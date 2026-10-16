import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { DaloEvent, OrgRole } from "@/lib/types";

export type StaffEvent = DaloEvent & { organizations: { id: string; name: string } };

/** Loads an event the current user can manage, or 404s. */
export async function requireEventStaff(eventId: string, next: string) {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*, organizations(id, name)")
    .eq("id", eventId)
    .maybeSingle<StaffEvent>();
  if (!event) notFound();

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) notFound();

  return { user, event, role: member.role as OrgRole, supabase };
}
