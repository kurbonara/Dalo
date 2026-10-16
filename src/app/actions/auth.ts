"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, safeNext, succeed } from "@/lib/redirect";
import { SITE_URL } from "@/lib/format";

async function origin() {
  const h = await headers();
  return h.get("origin") || SITE_URL;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail(`/login?next=${encodeURIComponent(next)}`, error.message);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const studentNo = String(formData.get("student_no") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const back = `/signup?next=${encodeURIComponent(next)}`;

  if (fullName.length < 2) fail(back, "Please enter your full name as it should appear on certificates.");
  if (password.length < 8) fail(back, "Password must be at least 8 characters.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, student_no: studentNo },
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) fail(back, error.message);

  if (!data.session) {
    succeed("/login", "Account created! Check your email to confirm it, then sign in.");
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const studentNo = String(formData.get("student_no") ?? "").trim();
  if (fullName.length < 2) fail("/account", "Please enter your full name.");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, student_no: studentNo || null })
    .eq("id", userId);
  if (error) fail("/account", error.message);

  revalidatePath("/", "layout");
  succeed("/account", "Profile saved.");
}
