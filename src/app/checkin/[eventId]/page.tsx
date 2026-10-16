import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SelfCheckin } from "./self-checkin";

export const metadata: Metadata = { title: "Check in" };

export default async function CheckinPage({ params, searchParams }: PageProps<"/checkin/[eventId]">) {
  const { eventId } = await params;
  const { m, c } = await searchParams;
  const mode = m === "out" ? "out" : "in";
  const code = typeof c === "string" ? c : "";
  await requireSession(`/checkin/${eventId}?m=${mode}&c=${encodeURIComponent(code)}`);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, organizations(name)")
    .eq("id", eventId)
    .maybeSingle<{ id: string; title: string; organizations: { name: string } | null }>();
  if (!event) notFound();

  return (
    <div className="container-page max-w-md py-12">
      <p className="text-center text-sm font-semibold uppercase tracking-wider text-stone-500">
        {event.organizations?.name}
      </p>
      <h1 className="mb-6 mt-1 text-center text-2xl font-bold tracking-tight">{event.title}</h1>
      <SelfCheckin eventId={eventId} code={code} mode={mode} />
    </div>
  );
}
