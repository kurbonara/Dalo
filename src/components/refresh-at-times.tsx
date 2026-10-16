"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// setTimeout can't wait longer than ~24.8 days.
const MAX_DELAY = 2 ** 31 - 1;

/**
 * Re-renders the page the moment any of the given times passes, e.g. when an
 * event starts or ends, so "Happening now", "Ended" and register buttons flip
 * on time. (Nothing changes in the database at those moments, so Realtime alone
 * can't catch them.)
 */
export function RefreshAtTimes({ times }: { times: (string | null | undefined)[] }) {
  const router = useRouter();
  const key = times.filter(Boolean).join(",");

  useEffect(() => {
    const now = Date.now();
    const delays = [...new Set(key.split(",").filter(Boolean))]
      .map((t) => new Date(t).getTime() - now + 300)
      .filter((d) => d > 0 && d < MAX_DELAY);
    const timers = delays.map((d) => setTimeout(() => router.refresh(), d));
    return () => timers.forEach(clearTimeout);
  }, [key, router]);

  return null;
}
