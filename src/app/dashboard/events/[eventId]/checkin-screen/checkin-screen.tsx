"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { getCheckinCode } from "@/app/actions/checkin";
import type { CheckinCode, CheckinMode } from "@/lib/types";

export function CheckinScreen({
  eventId,
  title,
  orgName,
  requireCheckout,
}: {
  eventId: string;
  title: string;
  orgName: string;
  requireCheckout: boolean;
}) {
  const [mode, setMode] = useState<CheckinMode>("in");
  const [code, setCode] = useState<CheckinCode | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(1);
  const offsetRef = useRef(0); // server clock minus local clock, in ms
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch a new code right after the current one expires, and at least every 10 s for fresh counts.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function run() {
      let nextIn = 3000;
      try {
        const res = await getCheckinCode(eventId, mode);
        if (cancelled) return;
        if ("error" in res) {
          setError(res.error);
        } else {
          setError(null);
          offsetRef.current = new Date(res.data.server_time).getTime() - Date.now();
          const url = `${window.location.origin}/checkin/${eventId}?m=${res.data.mode}&c=${res.data.code}`;
          const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
          if (cancelled) return;
          setCode(res.data);
          setSvg(qr);
          const untilExpiry = new Date(res.data.expires_at).getTime() - (Date.now() + offsetRef.current) + 300;
          nextIn = Math.max(500, Math.min(untilExpiry, 10_000));
        }
      } catch {
        if (!cancelled) setError("Connection lost. Retrying…");
      }
      if (!cancelled) timer = setTimeout(run, nextIn);
    }

    void run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId, mode]);

  // Countdown bar.
  useEffect(() => {
    if (!code) return;
    const tick = () => {
      const left = new Date(code.expires_at).getTime() - (Date.now() + offsetRef.current);
      setRemaining(Math.max(0, Math.min(1, left / (code.interval * 1000))));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [code]);

  const secondsLeft = code ? Math.ceil(remaining * code.interval) : 0;

  return (
    <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-brand-900 text-white">
      <div className="container-page flex flex-col items-center py-8 text-center">
        <div className="no-print mb-6 flex w-full flex-wrap items-center justify-between gap-3">
          <Link href={`/dashboard/events/${eventId}`} className="text-sm text-brand-200 hover:text-white">
            ← Event
          </Link>
          <div className="flex gap-2">
            {requireCheckout && (
              <div className="flex rounded-xl bg-white/10 p-1 text-sm" role="radiogroup" aria-label="Mode">
                {(["in", "out"] as CheckinMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => {
                      setCode(null);
                      setSvg("");
                      setMode(m);
                    }}
                    className={`rounded-lg px-4 py-1.5 font-semibold ${mode === m ? "bg-white text-brand-900" : "text-brand-100"}`}
                  >
                    {m === "in" ? "Check-in" : "Check-out"}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void containerRef.current?.requestFullscreen();
              }}
            >
              Fullscreen
            </button>
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">{orgName}</p>
        <h1 className="mt-1 max-w-3xl text-2xl font-bold sm:text-4xl">{title}</h1>
        <p className={`mt-4 rounded-full px-5 py-1.5 text-lg font-bold ${mode === "in" ? "bg-amber-300 text-amber-950" : "bg-sky-300 text-sky-950"}`}>
          Scan to {mode === "in" ? "CHECK IN" : "CHECK OUT"}
        </p>

        <div className="mt-6 w-full max-w-[min(80vh,520px)] rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
          {svg ? (
            <div className="aspect-square w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-stone-400">
              {error ?? "Loading code…"}
            </div>
          )}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${remaining < 0.2 ? "bg-red-500" : "bg-brand-600"}`}
              style={{ width: `${remaining * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-stone-500">New code in {secondsLeft}s</p>
        </div>

        {error && svg && <p className="mt-3 text-sm text-red-200">{error}</p>}

        <div className="mt-6 flex gap-8 text-center">
          <div>
            <p className="text-4xl font-bold tabular-nums">{code?.checked_in ?? "–"}</p>
            <p className="text-sm text-brand-200">checked in</p>
          </div>
          {requireCheckout && (
            <div>
              <p className="text-4xl font-bold tabular-nums">{code?.checked_out ?? "–"}</p>
              <p className="text-sm text-brand-200">checked out</p>
            </div>
          )}
        </div>

        <p className="mt-6 max-w-md text-sm text-brand-200">
          Open your phone camera and point it at the code. You must be signed in to Dalo and registered for this event.
        </p>
      </div>
    </div>
  );
}
