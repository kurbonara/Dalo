export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Manila";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const longDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}
export function formatLongDate(iso: string) {
  return longDateFmt.format(new Date(iso));
}
export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso));
}
export function formatDateTime(iso: string | null | undefined) {
  return iso ? dateTimeFmt.format(new Date(iso)) : "—";
}

/** "Sat, Oct 18, 2026 · 9:00 AM – 12:00 PM" (or spans dates when needed). */
export function formatRange(startIso: string, endIso: string) {
  const sameDay = formatDate(startIso) === formatDate(endIso);
  return sameDay
    ? `${formatDate(startIso)} · ${formatTime(startIso)} – ${formatTime(endIso)}`
    : `${formatDate(startIso)} ${formatTime(startIso)} – ${formatDate(endIso)} ${formatTime(endIso)}`;
}

/** Offset in minutes of TIMEZONE from UTC at the given instant. */
function tzOffsetMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-10-18T09:00" in TIMEZONE → ISO string in UTC. */
export function zonedLocalToISO(local: string) {
  const naive = new Date(`${local}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const offset = tzOffsetMinutes(naive);
  return new Date(naive.getTime() - offset * 60000).toISOString();
}

/** ISO string → "2026-10-18T09:00" in TIMEZONE, for datetime-local inputs. */
export function isoToZonedLocal(iso: string) {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + tzOffsetMinutes(d) * 60000);
  return shifted.toISOString().slice(0, 16);
}

export type EventPhase = "upcoming" | "live" | "ended";
export function eventPhase(startsAt: string, endsAt: string, now = Date.now()): EventPhase {
  if (now < new Date(startsAt).getTime()) return "upcoming";
  if (now <= new Date(endsAt).getTime()) return "live";
  return "ended";
}

export function slug(text: string) {
  return (
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event"
  );
}

const HOUR = 60 * 60 * 1000;

/**
 * When officers and attendees may record attendance (mirrors scan_ticket / self_check_in):
 * check-in from 1 hour before start until the end, check-out until 1 hour after the end.
 */
export function attendanceWindow(startsAt: string, endsAt: string, now = Date.now()) {
  const opensAt = new Date(new Date(startsAt).getTime() - HOUR).toISOString();
  const checkoutClosesAt = new Date(new Date(endsAt).getTime() + HOUR).toISOString();
  const state =
    now < new Date(opensAt).getTime()
      ? "not_open"
      : now > new Date(checkoutClosesAt).getTime()
        ? "closed"
        : now > new Date(endsAt).getTime()
          ? "checkout_only"
          : "open";
  return { state, opensAt, checkoutClosesAt } as const;
}
