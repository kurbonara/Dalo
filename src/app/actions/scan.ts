"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import type { ScanResult } from "@/lib/types";

/**
 * Scans a ticket on the server so the event's overview and report pages
 * are revalidated. Otherwise going back to them would show pre-scan numbers.
 */
export async function scanTicket(eventId: string, code: string, mode: "auto" | "in" | "out"): Promise<ScanResult> {
  if (!(await getSession())) {
    return { ok: false, result: "invalid", message: "Your session expired. Sign in again." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scan_ticket", {
    p_event_id: eventId,
    p_ticket_code: code,
    p_mode: mode,
  });
  if (error) return { ok: false, result: "invalid", message: error.message };

  const result = data as ScanResult;
  if (result.ok) revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return result;
}
