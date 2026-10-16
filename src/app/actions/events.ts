"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fail, succeed } from "@/lib/redirect";
import { zonedLocalToISO } from "@/lib/format";

type ParsedEvent =
  | { error: string }
  | {
      values: {
        title: string;
        description: string | null;
        venue: string | null;
        starts_at: string;
        ends_at: string;
        capacity: number | null;
        registration_open: boolean;
        is_published: boolean;
        require_checkout: boolean;
        min_attendance_minutes: number;
        certificate_signatory: string | null;
        certificate_signatory_title: string | null;
      };
    };

function parseEventForm(formData: FormData): ParsedEvent {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const title = text("title");
  const startsAt = zonedLocalToISO(text("starts_at"));
  const endsAt = zonedLocalToISO(text("ends_at"));
  const capacityRaw = text("capacity");
  const minMinutesRaw = text("min_attendance_minutes");

  if (title.length < 2) return { error: "Please give the event a title." };
  if (!startsAt || !endsAt) return { error: "Please set when the event starts and ends." };
  if (new Date(endsAt) <= new Date(startsAt)) return { error: "The event must end after it starts." };

  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    return { error: "Capacity must be a whole number above 0, or left blank for unlimited." };
  }
  const minMinutes = minMinutesRaw ? Number(minMinutesRaw) : 0;
  if (!Number.isInteger(minMinutes) || minMinutes < 0) {
    return { error: "Minimum attendance must be a whole number of minutes." };
  }

  return {
    values: {
      title,
      description: text("description") || null,
      venue: text("venue") || null,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity,
      registration_open: formData.get("registration_open") === "on",
      is_published: formData.get("is_published") === "on",
      require_checkout: formData.get("require_checkout") === "on",
      min_attendance_minutes: minMinutes,
      certificate_signatory: text("certificate_signatory") || null,
      certificate_signatory_title: text("certificate_signatory_title") || null,
    },
  };
}

export async function createEvent(orgId: string, formData: FormData) {
  await requireUser();
  const back = `/dashboard/orgs/${orgId}/events/new`;
  const parsed = parseEventForm(formData);
  if ("error" in parsed) fail(back, parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.values, org_id: orgId })
    .select("id")
    .single();
  if (error) fail(back, error.message);

  revalidatePath(`/dashboard/orgs/${orgId}`);
  revalidatePath("/events");
  redirect(`/dashboard/events/${data.id}?message=${encodeURIComponent("Event created. Share the link so members can register.")}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  await requireUser();
  const path = `/dashboard/events/${eventId}`;
  const parsed = parseEventForm(formData);
  if ("error" in parsed) fail(`${path}/edit`, parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("events").update(parsed.values).eq("id", eventId);
  if (error) fail(`${path}/edit`, error.message);

  revalidatePath(path);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  succeed(path, "Event saved.");
}

export async function setRegistrationOpen(eventId: string, open: boolean) {
  await requireUser();
  const path = `/dashboard/events/${eventId}`;
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ registration_open: open }).eq("id", eventId);
  if (error) fail(path, error.message);
  revalidatePath(path);
  revalidatePath(`/events/${eventId}`);
  succeed(path, open ? "Registration reopened." : "Registration closed.");
}

export async function deleteEvent(eventId: string, orgId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) fail(`/dashboard/events/${eventId}`, error.message);
  revalidatePath(`/dashboard/orgs/${orgId}`);
  revalidatePath("/events");
  succeed(`/dashboard/orgs/${orgId}`, "Event deleted.");
}

export async function resetAttendance(eventId: string, registrationId: string) {
  await requireUser();
  const path = `/dashboard/events/${eventId}/report`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_attendance", { p_registration_id: registrationId });
  if (error) fail(path, error.message);
  revalidatePath(path);
  succeed(path, "Attendance reset for that attendee.");
}
