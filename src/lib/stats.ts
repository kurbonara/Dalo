import type { AttendanceRow } from "@/lib/types";

export function attendanceStats(rows: AttendanceRow[]) {
  const active = rows.filter((r) => r.status === "registered");
  const checkedIn = active.filter((r) => r.checked_in_at).length;
  const checkedOut = active.filter((r) => r.checked_out_at).length;
  const completed = active.filter((r) => r.completed).length;
  return {
    registered: active.length,
    cancelled: rows.length - active.length,
    checkedIn,
    checkedOut,
    stillInside: checkedIn - checkedOut,
    completed,
    noShows: active.length - checkedIn,
    turnout: active.length ? Math.round((checkedIn / active.length) * 100) : 0,
  };
}
