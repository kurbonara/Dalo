"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { selfCheckIn } from "@/app/actions/checkin";
import type { CheckinMode, SelfCheckinResult } from "@/lib/types";

const GOOD = new Set(["checked_in", "checked_out", "already_in", "already_out"]);

export function SelfCheckin({ eventId, code, mode }: { eventId: string; code: string; mode: CheckinMode }) {
  const [result, setResult] = useState<SelfCheckinResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Run once, even under React's development double-invocation.
    if (started.current) return;
    started.current = true;
    selfCheckIn(eventId, code, mode)
      .then(setResult)
      .catch(() =>
        setResult({ ok: false, result: "invalid", message: "Network error. Scan the code on the screen again." }),
      );
  }, [eventId, code, mode]);

  if (!result) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center" aria-busy="true">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" />
        <p className="font-medium">{mode === "in" ? "Checking you in…" : "Checking you out…"}</p>
      </div>
    );
  }

  const good = GOOD.has(result.result);
  const fresh = result.result === "checked_in" || result.result === "checked_out";

  return (
    <div className={`card overflow-hidden text-center ${good ? "border-brand-200" : "border-red-200"}`} role="status">
      <div className={`px-6 py-10 ${good ? (fresh ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-900") : "bg-red-50 text-red-900"}`}>
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${
            good ? (fresh ? "bg-white text-brand-700" : "bg-brand-700 text-white") : "bg-red-600 text-white"
          }`}
          aria-hidden="true"
        >
          {good ? "✓" : "!"}
        </div>
        <p className="text-2xl font-bold">{result.message}</p>
        {result.name && <p className="mt-1 opacity-80">{result.name}</p>}
        {fresh && (
          <p className="mt-2 text-sm opacity-80">
            {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 p-5">
        {result.result === "not_registered" ? (
          <Link href={`/events/${eventId}`} className="btn-primary">
            Go to event page
          </Link>
        ) : (
          <Link href="/tickets" className="btn-primary">
            My tickets
          </Link>
        )}
        {result.result === "expired" && (
          <p className="text-sm text-stone-500">Codes change every few seconds. Scan the one on the screen now.</p>
        )}
      </div>
    </div>
  );
}
