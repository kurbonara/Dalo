import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrgRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/actions/events";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ params, searchParams }: PageProps<"/dashboard/orgs/[orgId]/events/new">) {
  const { orgId } = await params;
  await requireUser(`/dashboard/orgs/${orgId}/events/new`);
  const flash = await searchParams;
  if (!(await getOrgRole(orgId))) notFound();

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();

  return (
    <div className="container-page max-w-2xl py-10">
      <PageHeader title="New event" subtitle={org?.name} back={{ href: `/dashboard/orgs/${orgId}`, label: org?.name ?? "Back" }} />
      <Flash params={flash} />
      <EventForm action={createEvent.bind(null, orgId)} submitLabel="Create event" />
    </div>
  );
}
