"use client";

import { createContext, use, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/*
 * Filters, tabs and search boxes only change the URL's query string, so Next.js
 * keeps showing the old page (no loading.tsx) until the new data arrives.
 * These components run that navigation in a transition so the clicked tab
 * highlights immediately and the results area shows a skeleton meanwhile.
 */

type PendingNav = {
  pending: boolean;
  target: string | null;
  navigate: (href: string) => void;
};

const PendingNavContext = createContext<PendingNav | null>(null);

function usePendingNav() {
  const ctx = use(PendingNavContext);
  if (!ctx) throw new Error("Wrap this component in <PendingNavProvider>.");
  return ctx;
}

export function PendingNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  function navigate(href: string) {
    setTarget(href);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <PendingNavContext value={{ pending, target: pending ? target : null, navigate }}>
      {children}
    </PendingNavContext>
  );
}

/** Shows `fallback` instead of `children` while a filter/tab/search navigation is in flight. */
export function PendingArea({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const { pending } = usePendingNav();
  return pending ? fallback : children;
}

/** Segmented tabs that update the URL. */
export function NavTabs({
  tabs,
  activeHref,
}: {
  tabs: { href: string; label: string }[];
  activeHref: string;
}) {
  const { target, navigate } = usePendingNav();
  const current = target ?? activeHref;

  return (
    <div className="flex flex-wrap rounded-xl border border-stone-300 bg-white p-1 text-sm">
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              if (!active) navigate(tab.href);
            }}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              active ? "bg-brand-700 text-white" : "text-stone-600 hover:text-ink"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}

/** A search box that navigates client-side, keeping the other query params. */
export function NavSearch({
  action,
  defaultValue,
  placeholder,
  keep = {},
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
  keep?: Record<string, string | undefined>;
}) {
  const { pending, navigate } = usePendingNav();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value);
    if (q) params.set("q", q);
    const query = params.toString();
    navigate(query ? `${action}?${query}` : action);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 gap-2" role="search">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} className="input max-w-sm" />
      <button className="btn-secondary" disabled={pending}>
        {pending ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
