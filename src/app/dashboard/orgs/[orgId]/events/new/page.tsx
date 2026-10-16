import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrgRole, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/actions/events";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ params, searchParams }: PageProps<"/dashboard/orgs/[orgId]/events/new">) {
  const { orgId } = await params;
  await requireSession(`/dashboard/orgs/${orgId}/events/new`);
  const flash = await searchParams;
  const supabase = await createClient();
  const [role, { data: org }] = await Promise.all([
    getOrgRole(orgId),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);
  if (!role) notFound();

  return (
    <div className="container-page max-w-2xl py-10">
      <PageHeader title="New event" subtitle={org?.name} back={{ href: `/dashboard/orgs/${orgId}`, label: org?.name ?? "Back" }} />
      <Flash params={flash} />
      <EventForm action={createEvent.bind(null, orgId)} submitLabel="Create event" />
    </div>
  );
}
