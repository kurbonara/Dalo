import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Verify a certificate" };

async function lookup(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  redirect(code ? `/verify/${code}` : "/verify");
}

export default function VerifyPage() {
  return (
    <div className="container-page max-w-lg py-16">
      <PageHeader
        title="Verify a certificate"
        subtitle="Enter the certificate number printed on a Dalo e-certificate, or scan its QR code."
      />
      <form action={lookup} className="card flex gap-2 p-4">
        <input
          name="code"
          className="input font-mono uppercase"
          placeholder="e.g. 3F9A1C0B7D2E"
          aria-label="Certificate number"
          required
        />
        <button className="btn-primary">Verify</button>
      </form>
    </div>
  );
}
