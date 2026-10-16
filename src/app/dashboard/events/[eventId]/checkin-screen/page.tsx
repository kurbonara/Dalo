import type { Metadata } from "next";
import Link from "next/link";
import { requireEventStaff } from "@/lib/staff";
import { CheckinScreen } from "./checkin-screen";

export const metadata: Metadata = { title: "Self check-in screen" };

export default async function CheckinScreenPage({ params }: PageProps<"/dashboard/events/[eventId]/checkin-screen">) {
  const { eventId } = await params;
  const { event } = await requireEventStaff(eventId, `/dashboard/events/${eventId}/checkin-screen`);

  if (!event.self_checkin_enabled) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Self check-in is off</h1>
        <p className="mt-2 text-stone-600">
          Turn on <strong>Allow self check-in</strong> in the event settings to show a rotating QR code that attendees
          scan with their own phones.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/dashboard/events/${eventId}/edit`} className="btn-primary">
            Edit event settings
          </Link>
          <Link href={`/dashboard/events/${eventId}`} className="btn-secondary">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CheckinScreen
      eventId={eventId}
      title={event.title}
      orgName={event.organizations.name}
      requireCheckout={event.require_checkout}
    />
  );
}
