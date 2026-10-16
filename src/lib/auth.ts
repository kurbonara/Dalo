import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, Profile } from "@/lib/types";

/** The signed-in user's id and email from the verified JWT. No database round trip. */
export const getSession = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  return { id, email: (data.claims.email as string | undefined) ?? null };
});

/** The signed-in user's profile, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_no, email")
    .eq("id", session.id)
    .single();

  return profile ?? { id: session.id, full_name: "", student_no: null, email: session.email };
});

export async function requireUser(next?: string): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireSession(next?: string) {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

/** The current user's role in an org, or null if they aren't a member. */
export async function getOrgRole(orgId: string): Promise<OrgRole | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.id)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}
