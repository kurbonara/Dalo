import type { Metadata } from "next";
import { requireEventStaff } from "@/lib/staff";
import { updateEvent } from "@/app/actions/events";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/edit">) {
  const { eventId } = await params;
  const { event } = await requireEventStaff(eventId, `/dashboard/events/${eventId}/edit`);
  const flash = await searchParams;

  return (
    <div className="container-page max-w-2xl py-10">
      <PageHeader title="Edit event" subtitle={event.title} back={{ href: `/dashboard/events/${eventId}`, label: "Event" }} />
      <Flash params={flash} />
      <EventForm action={updateEvent.bind(null, eventId)} event={event} submitLabel="Save changes" />
    </div>
  );
}
