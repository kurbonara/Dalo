import type { Metadata } from "next";
import { requireEventStaff } from "@/lib/staff";
import { formatRange } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scanner" };

export default async function ScanPage({ params }: PageProps<"/dashboard/events/[eventId]/scan">) {
  const { eventId } = await params;
  const { event } = await requireEventStaff(eventId, `/dashboard/events/${eventId}/scan`);

  return (
    <div className="container-page max-w-2xl py-6">
      <PageHeader
        title={event.title}
        subtitle={formatRange(event.starts_at, event.ends_at)}
        back={{ href: `/dashboard/events/${eventId}`, label: "Event" }}
      />
      <Scanner eventId={eventId} requireCheckout={event.require_checkout} />
    </div>
  );
}
