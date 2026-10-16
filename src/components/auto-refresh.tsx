"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

let lastRefresh = 0;

/**
 * Keeps server-rendered data fresh: re-fetches when the tab becomes visible again,
 * and optionally on an interval while the tab is visible.
 */
export function AutoRefresh({ seconds }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      // Several instances can be mounted (layout + page); don't refresh twice in a row.
      if (Date.now() - lastRefresh < 2000) return;
      lastRefresh = Date.now();
      router.refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = seconds
      ? setInterval(() => {
          if (document.visibilityState === "visible") refresh();
        }, seconds * 1000)
      : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (id) clearInterval(id);
    };
  }, [router, seconds]);

  return null;
}
