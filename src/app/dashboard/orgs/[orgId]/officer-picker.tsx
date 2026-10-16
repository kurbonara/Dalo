"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchOfficerCandidates, type OfficerCandidate } from "@/app/actions/orgs";

/**
 * Search-as-you-type for existing Dalo accounts. Submits `user_id` when a suggestion
 * is picked, or `email` when the owner types a full email address instead.
 */
export function OfficerPicker({ orgId }: { orgId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OfficerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<OfficerCandidate | null>(null);
  const latest = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const trimmed = query.trim();
  const searching = trimmed.length >= 2 && !picked;

  useEffect(() => {
    if (!searching) return;
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchOfficerCandidates(orgId, trimmed);
        if (id !== latest.current) return; // a newer search started
        setResults(found);
        setActive(0);
        setOpen(true);
      } finally {
        if (id === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [orgId, trimmed, searching]);

  function pick(candidate: OfficerCandidate) {
    setPicked(candidate);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setPicked(null);
    setQuery("");
    setResults([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2">
        <input type="hidden" name="user_id" value={picked.user_id} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-900">{picked.full_name || "Unnamed account"}</p>
          <p className="truncate text-xs text-brand-800/80">
            {[picked.student_no, picked.email_hint].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
          aria-label="Choose someone else"
        >
          Change
        </button>
      </div>
    );
  }

  const showList = open && searching;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input"
        id="member-search"
        name="email"
        type="text"
        autoComplete="off"
        placeholder="Search name, student no., or email"
        value={query}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <span
          className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600"
          aria-hidden="true"
        />
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="card absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto p-1 shadow-lg"
        >
          {results.length ? (
            results.map((r, i) => (
              <li
                key={r.user_id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus so blur doesn't close first
                  pick(r);
                }}
                className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-brand-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.full_name || "Unnamed account"}</span>
                  {r.joined_events && (
                    <span className="badge shrink-0 bg-amber-100 text-[10px] text-amber-800">Joined your events</span>
                  )}
                </div>
                <p className="truncate text-xs text-stone-500">
                  {[r.student_no, r.email_hint].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-stone-500">
              {loading
                ? "Searching…"
                : trimmed.includes("@")
                  ? "No match yet. If they have a Dalo account, finish typing their full email and press Add."
                  : "No accounts match. They need to sign up for Dalo first."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
