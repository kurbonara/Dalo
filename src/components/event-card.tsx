import Link from "next/link";
import { TIMEZONE, formatRange } from "@/lib/format";
import { PhaseBadge } from "@/components/badges";
import type { EventWithOrg } from "@/lib/types";

export function EventCard({ event, href }: { event: EventWithOrg; href?: string }) {
  const start = new Date(event.starts_at);
  const month = start.toLocaleString("en-US", { month: "short", timeZone: TIMEZONE });
  const day = start.toLocaleString("en-US", { day: "numeric", timeZone: TIMEZONE });

  return (
    <Link
      href={href ?? `/events/${event.id}`}
      className="card group flex gap-4 p-4 transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
        <span className="text-xs font-semibold uppercase">{month}</span>
        <span className="text-2xl font-bold leading-none">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold group-hover:text-brand-700">{event.title}</h3>
          <PhaseBadge startsAt={event.starts_at} endsAt={event.ends_at} />
        </div>
        {event.organizations && <p className="text-sm text-stone-600">{event.organizations.name}</p>}
        <p className="mt-1 text-xs text-stone-500">
          {formatRange(event.starts_at, event.ends_at)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
      </div>
    </Link>
  );
}
