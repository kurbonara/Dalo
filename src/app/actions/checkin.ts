"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import type { CheckinCode, CheckinMode, SelfCheckinResult } from "@/lib/types";

/** Officers: the rotating code to display right now, plus live counts. */
export async function getCheckinCode(
  eventId: string,
  mode: CheckinMode,
): Promise<{ data: CheckinCode } | { error: string }> {
  if (!(await getSession())) return { error: "Your session expired. Sign in again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_checkin_code", { p_event_id: eventId, p_mode: mode });
  if (error) return { error: error.message };
  return { data: data as CheckinCode };
}

/** Attendees: check in/out with a code scanned from the officer's screen. */
export async function selfCheckIn(eventId: string, code: string, mode: string): Promise<SelfCheckinResult> {
  if (!(await getSession())) {
    return { ok: false, result: "invalid", message: "Sign in first, then scan the code on the screen again." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("self_check_in", { p_event_id: eventId, p_code: code, p_mode: mode });
  if (error) return { ok: false, result: "invalid", message: error.message };

  const result = data as SelfCheckinResult;
  if (result.result === "checked_in" || result.result === "checked_out") {
    revalidatePath("/tickets", "layout");
  }
  return result;
}
