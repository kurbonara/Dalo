"use client";

import { CertificateButton } from "@/components/certificate-button";
import type { AttendanceRow, CertificateData } from "@/lib/types";

function csvCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ReportTools({
  rows,
  certificates,
  baseName,
  timeZone,
}: {
  rows: AttendanceRow[];
  certificates: CertificateData[];
  baseName: string;
  timeZone: string;
}) {
  function exportCsv() {
    const fmt = (iso: string | null) =>
      iso
        ? new Date(iso).toLocaleString("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" })
        : "";
    const header = [
      "Name",
      "Student No.",
      "Email",
      "Status",
      "Registered",
      "Checked in",
      "Checked out",
      "Minutes attended",
      "Completed",
      "Certificate No.",
    ];
    const lines = rows.map((r) =>
      [
        r.full_name,
        r.student_no,
        r.email,
        r.status === "cancelled" ? "Cancelled" : r.checked_in_at ? "Attended" : "No-show",
        fmt(r.registered_at),
        fmt(r.checked_in_at),
        fmt(r.checked_out_at),
        r.minutes_attended,
        r.completed ? "Yes" : "No",
        r.completed ? r.certificate_code : "",
      ]
        .map(csvCell)
        .join(","),
    );
    // BOM so Excel opens UTF-8 names (ñ, accents) correctly.
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}-attendance.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" className="btn-secondary" onClick={exportCsv}>
        Export CSV
      </button>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Print
      </button>
      <CertificateButton
        certificates={certificates}
        filename={`${baseName}-certificates.pdf`}
        label={`Download certificates (${certificates.length})`}
      />
    </div>
  );
}
