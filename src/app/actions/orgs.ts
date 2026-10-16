"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fail, succeed } from "@/lib/redirect";

export async function createOrg(formData: FormData) {
  const user = await requireUser("/dashboard");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) fail("/dashboard", "Organization name is too short.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, description: description || null, created_by: user.id })
    .select("id")
    .single();
  if (error) fail("/dashboard", error.message);

  revalidatePath("/dashboard");
  redirect(`/dashboard/orgs/${data.id}`);
}

export async function updateOrg(orgId: string, formData: FormData) {
  await requireUser();
  const path = `/dashboard/orgs/${orgId}`;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) fail(path, "Organization name is too short.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name, description: description || null })
    .eq("id", orgId);
  if (error) fail(path, error.message);

  revalidatePath(path);
  succeed(path, "Organization updated.");
}

export async function deleteOrg(orgId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("organizations")
    .delete({ count: "exact" })
    .eq("id", orgId);
  if (error || !count) fail(`/dashboard/orgs/${orgId}`, error?.message ?? "Only owners can delete an organization.");
  revalidatePath("/dashboard");
  succeed("/dashboard", "Organization deleted.");
}

export async function addMember(orgId: string, formData: FormData) {
  await requireUser();
  const path = `/dashboard/orgs/${orgId}`;
  const userId = String(formData.get("user_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "officer");
  if (!userId && !email) fail(path, "Pick someone from the suggestions or type their email.");

  const supabase = await createClient();
  let added = email;
  if (userId) {
    // Picked from the suggestions.
    const { data, error } = await supabase.rpc("add_org_member_by_id", {
      p_org_id: orgId,
      p_user_id: userId,
      p_role: role,
    });
    if (error) fail(path, error.message);
    added = (data as string) || "They";
  } else {
    const { error } = await supabase.rpc("add_org_member", { p_org_id: orgId, p_email: email, p_role: role });
    if (error) fail(path, error.message);
  }

  revalidatePath(path);
  succeed(path, `${added} was added as ${role}.`);
}

export type OfficerCandidate = {
  user_id: string;
  full_name: string;
  student_no: string | null;
  email_hint: string | null;
  joined_events: boolean;
};

/** Owners: suggestions while typing in "Add an officer". */
export async function searchOfficerCandidates(orgId: string, query: string): Promise<OfficerCandidate[]> {
  if (query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_profiles_for_org", { p_org_id: orgId, p_query: query });
  return (data ?? []) as OfficerCandidate[];
}

export async function removeMember(orgId: string, userId: string) {
  const me = await requireUser();
  const path = `/dashboard/orgs/${orgId}`;
  const supabase = await createClient();

  const { data: owners } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "owner");
  if (owners?.length === 1 && owners[0].user_id === userId) {
    fail(path, "An organization needs at least one owner.");
  }

  const { error } = await supabase.from("org_members").delete().eq("org_id", orgId).eq("user_id", userId);
  if (error) fail(path, error.message);

  if (userId === me.id) {
    revalidatePath("/dashboard");
    succeed("/dashboard", "You left the organization.");
  }
  revalidatePath(path);
  succeed(path, "Member removed.");
}
