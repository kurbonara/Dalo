"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type RealtimeSubscription = {
  table: "events" | "registrations";
  /** Supabase Realtime filter, e.g. `event_id=eq.<uuid>` or `org_id=in.(a,b)`. */
  filter?: string;
};

/**
 * Re-renders the page as soon as a matching row changes in the database.
 * Supabase applies row-level security, so users only hear about rows they can read.
 */
export function RealtimeRefresh({ subscriptions }: { subscriptions: RealtimeSubscription[] }) {
  const router = useRouter();
  const key = JSON.stringify(subscriptions);

  useEffect(() => {
    const subs = JSON.parse(key) as RealtimeSubscription[];
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Many changes can arrive at once (e.g. a busy scanner); refresh at most once every 800 ms.
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        router.refresh();
      }, 800);
    };

    const channel = supabase.channel(`dalo:${key}`);
    for (const sub of subs) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: sub.table, ...(sub.filter ? { filter: sub.filter } : {}) },
        schedule,
      );
    }

    let cancelled = false;
    // Load the session first so Realtime connects as the signed-in user (needed for RLS).
    void supabase.auth.getSession().then(async () => {
      if (cancelled) return;
      await supabase.realtime.setAuth();
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [key, router]);

  return null;
}
