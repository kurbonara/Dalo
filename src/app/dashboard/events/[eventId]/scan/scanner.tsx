"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { scanTicket } from "@/app/actions/scan";
import type { ScanResult } from "@/lib/types";

type Mode = "auto" | "in" | "out";
type LogEntry = ScanResult & { at: number; key: number };

const modeLabels: Record<Mode, string> = { auto: "Auto", in: "Check-in only", out: "Check-out only" };

function tone(result: ScanResult) {
  if (result.result === "checked_in") return "border-amber-300 bg-amber-50 text-amber-900";
  if (result.result === "checked_out") return "border-brand-300 bg-brand-50 text-brand-900";
  if (["already_in", "already_out", "too_soon"].includes(result.result)) return "border-sky-300 bg-sky-50 text-sky-900";
  return "border-red-300 bg-red-50 text-red-900";
}

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    navigator.vibrate?.(ok ? 80 : [80, 60, 80]);
  } catch {
    // Audio is a nicety; ignore failures.
  }
}

export function Scanner({ eventId, requireCheckout }: { eventId: string; requireCheckout: boolean }) {
  const [mode, setMode] = useState<Mode>("auto");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<LogEntry | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [manual, setManual] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const modeRef = useRef<Mode>(mode);
  const recentRef = useRef<Map<string, number>>(new Map());
  const busyRef = useRef(false);
  const keyRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const submit = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || busyRef.current) return;
      // Ignore the same code seen in the last 4 seconds (camera sees it many times per second).
      const now = Date.now();
      const seen = recentRef.current.get(trimmed);
      if (seen && now - seen < 4000) return;
      recentRef.current.set(trimmed, now);

      busyRef.current = true;
      setBusy(true);
      let result: ScanResult;
      try {
        result = await scanTicket(eventId, trimmed, modeRef.current);
      } catch {
        result = { ok: false, result: "invalid", message: "Network error. Check your connection and scan again." };
        recentRef.current.delete(trimmed);
      }
      const entry = { ...result, at: Date.now(), key: ++keyRef.current };
      setLast(entry);
      setLog((prev) => [entry, ...prev].slice(0, 25));
      beep(result.ok);
      busyRef.current = false;
      setBusy(false);
    },
    [eventId],
  );

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        // already stopped
      }
    }
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("dalo-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => {
          const size = Math.floor(Math.min(w, h) * 0.7);
          return { width: size, height: size };
        } },
        (text) => void submit(text),
        () => {},
      );
      setCameraOn(true);
    } catch (e) {
      scannerRef.current = null;
      setCameraError(
        e instanceof Error && /permission|notallowed/i.test(e.message + e.name)
          ? "Camera permission was denied. Allow camera access in your browser settings, or enter codes manually."
          : "Could not start the camera. Camera scanning needs HTTPS (or localhost) and a device with a camera.",
      );
    }
  }, [submit]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const counts = log.reduce(
    (acc, e) => {
      if (e.result === "checked_in") acc.in++;
      else if (e.result === "checked_out") acc.out++;
      else if (!e.ok) acc.bad++;
      return acc;
    },
    { in: 0, out: 0, bad: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-stone-300 bg-white p-1 text-sm" role="radiogroup" aria-label="Scan mode">
          {(Object.keys(modeLabels) as Mode[])
            .filter((m) => requireCheckout || m !== "out")
            .map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 font-medium ${mode === m ? "bg-brand-700 text-white" : "text-stone-600"}`}
              >
                {modeLabels[m]}
              </button>
            ))}
        </div>
        <p className="text-xs text-stone-500">
          {mode === "auto" ? "First scan checks in, next scan checks out." : mode === "in" ? "Only checks people in." : "Only checks people out."}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="relative bg-stone-900">
          <div id="dalo-reader" className="mx-auto w-full max-w-md [&_video]:!w-full" />
          {!cameraOn && (
            <div className="flex aspect-square max-h-96 w-full flex-col items-center justify-center gap-3 p-6 text-center text-stone-300">
              <p className="text-sm">Point the camera at an attendee&apos;s QR ticket.</p>
              <button type="button" onClick={startCamera} className="btn-primary px-6 py-3">
                Start camera
              </button>
              {cameraError && <p className="max-w-sm text-sm text-red-300">{cameraError}</p>}
            </div>
          )}
        </div>
        {cameraOn && (
          <div className="flex justify-end border-t border-stone-200 p-2">
            <button type="button" onClick={stopCamera} className="btn-ghost text-xs">
              Stop camera
            </button>
          </div>
        )}
      </div>

      <div
        aria-live="assertive"
        className={`rounded-2xl border-2 p-5 transition ${last ? tone(last) : "border-dashed border-stone-300 text-stone-500"}`}
      >
        {last ? (
          <div key={last.key} className="animate-[pulse_0.4s_ease-out_1]">
            <p className="text-sm font-semibold uppercase tracking-wider">{last.message}</p>
            {last.name && <p className="mt-1 text-2xl font-bold">{last.name}</p>}
            {last.student_no && <p className="text-sm opacity-80">{last.student_no}</p>}
          </div>
        ) : (
          <p className="text-sm">{busy ? "Checking…" : "Scan results appear here."}</p>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          recentRef.current.delete(manual.trim());
          void submit(manual);
          setManual("");
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="input font-mono"
          placeholder="Or type / paste a ticket code"
          aria-label="Ticket code"
        />
        <button className="btn-secondary" disabled={busy || !manual.trim()}>
          Submit
        </button>
      </form>

      {log.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">This session</h2>
            <p className="text-xs text-stone-500">
              {counts.in} in · {counts.out} out · {counts.bad} rejected
            </p>
          </div>
          <ul className="divide-y divide-stone-100 text-sm">
            {log.map((e) => (
              <li key={e.key} className="flex items-center gap-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${e.result === "checked_in" ? "bg-amber-500" : e.result === "checked_out" ? "bg-brand-600" : e.ok ? "bg-sky-500" : "bg-red-500"}`} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{e.name ?? "Unknown"}</span>
                  <span className="text-stone-500"> · {e.message}</span>
                </span>
                <span className="text-xs tabular-nums text-stone-400">
                  {new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
