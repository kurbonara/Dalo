import { eventPhase } from "@/lib/format";

export function PhaseBadge({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const phase = eventPhase(startsAt, endsAt);
  const styles = {
    upcoming: "bg-sky-50 text-sky-700",
    live: "bg-amber-100 text-amber-800",
    ended: "bg-stone-100 text-stone-600",
  }[phase];
  const label = { upcoming: "Upcoming", live: "Happening now", ended: "Ended" }[phase];
  return <span className={`badge ${styles}`}>{label}</span>;
}

export function AttendanceBadge({
  status,
  checkedInAt,
  checkedOutAt,
  completed,
}: {
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  completed?: boolean;
}) {
  if (status === "cancelled") return <span className="badge bg-stone-100 text-stone-500">Cancelled</span>;
  if (completed) return <span className="badge bg-brand-100 text-brand-800">Completed</span>;
  if (checkedOutAt) return <span className="badge bg-orange-50 text-orange-700">Checked out</span>;
  if (checkedInAt) return <span className="badge bg-amber-100 text-amber-800">Checked in</span>;
  return <span className="badge bg-sky-50 text-sky-700">Registered</span>;
}
