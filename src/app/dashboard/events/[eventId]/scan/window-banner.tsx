"use client";

import { useEffect, useState } from "react";
import { attendanceWindow, formatDateTime } from "@/lib/format";

/** Explains when check-in/out is accepted. Re-evaluates every second, so it changes the moment the event ends. */
export function WindowBanner({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (now === null) return null;
  const { state, opensAt, checkoutClosesAt } = attendanceWindow(startsAt, endsAt, now);
  const banner = {
    open: null,
    not_open: {
      tone: "border-sky-200 bg-sky-50 text-sky-900",
      text: `Check-in opens ${formatDateTime(opensAt)} (1 hour before the event).`,
    },
    checkout_only: {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      text: `This event has ended. Scans now check people out (until ${formatDateTime(checkoutClosesAt)}). New check-ins are closed.`,
    },
    closed: {
      tone: "border-stone-300 bg-stone-100 text-stone-700",
      text: "This event has ended and attendance is closed. Scans will be refused.",
    },
  }[state];
  if (!banner) return null;
  return (
    <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${banner.tone}`}>
      {banner.text}
    </p>
  );
}
