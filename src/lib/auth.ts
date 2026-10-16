import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, Profile } from "@/lib/types";

/** The signed-in user's profile, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_no, email")
    .eq("id", userId)
    .single();

  return (
    profile ?? {
      id: userId,
      full_name: "",
      student_no: null,
      email: (data.claims.email as string | undefined) ?? null,
    }
  );
});

export async function requireUser(next?: string): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** The current user's role in an org, or null if they aren't a member. */
export async function getOrgRole(orgId: string): Promise<OrgRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}
