"use client";

import { useState } from "react";
import type { CertificateData } from "@/lib/types";

export function CertificateButton({
  certificates,
  filename,
  label = "Download certificate",
  className = "btn-primary",
}: {
  certificates: CertificateData[];
  filename: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { buildCertificatesPdf, downloadBytes } = await import("@/lib/certificate");
      const bytes = await buildCertificatesPdf(certificates);
      downloadBytes(bytes, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the certificate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={download} disabled={busy || !certificates.length}>
        {busy ? "Generating PDF…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
