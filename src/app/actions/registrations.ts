"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fail, succeed } from "@/lib/redirect";
import type { Registration } from "@/lib/types";

export async function registerForEvent(eventId: string) {
  await requireUser(`/events/${eventId}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", { p_event_id: eventId });
  if (error) fail(`/events/${eventId}`, error.message);

  const registration = data as Registration;
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/tickets");
  redirect(`/tickets/${registration.id}?message=${encodeURIComponent("You're registered! Show this QR code at the entrance.")}`);
}

export async function cancelRegistration(eventId: string) {
  await requireUser(`/events/${eventId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_registration", { p_event_id: eventId });
  if (error) fail(`/events/${eventId}`, error.message);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/tickets");
  succeed(`/events/${eventId}`, "Your registration was cancelled.");
}
