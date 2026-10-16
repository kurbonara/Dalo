import { isoToZonedLocal, TIMEZONE } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { DaloEvent } from "@/lib/types";

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  event?: DaloEvent;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Details</legend>
        <h2 className="font-semibold">Details</h2>
        <div>
          <label className="label" htmlFor="title">Event title</label>
          <input className="input" id="title" name="title" defaultValue={event?.title} required />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea className="input min-h-28" id="description" name="description" defaultValue={event?.description ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="venue">Venue</label>
          <input className="input" id="venue" name="venue" defaultValue={event?.venue ?? ""} placeholder="e.g. AVR, 3rd floor Main Building" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="starts_at">Starts</label>
            <input
              className="input"
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              defaultValue={event ? isoToZonedLocal(event.starts_at) : undefined}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="ends_at">Ends</label>
            <input
              className="input"
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              defaultValue={event ? isoToZonedLocal(event.ends_at) : undefined}
              required
            />
          </div>
        </div>
        <p className="hint -mt-2">Times are in {TIMEZONE}.</p>
      </fieldset>

      <fieldset className="card space-y-4 p-6">
        <h2 className="font-semibold">Registration</h2>
        <div>
          <label className="label" htmlFor="capacity">Capacity</label>
          <input
            className="input max-w-48"
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={event?.capacity ?? ""}
            placeholder="Unlimited"
          />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="registration_open" defaultChecked={event?.registration_open ?? true} className="mt-0.5 h-4 w-4 accent-brand-700" />
          <span>
            <span className="font-medium">Registration open</span>
            <span className="block text-stone-500">Members can register and get a ticket.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={event?.is_published ?? true} className="mt-0.5 h-4 w-4 accent-brand-700" />
          <span>
            <span className="font-medium">Published</span>
            <span className="block text-stone-500">Show this event on the public events page. Unpublished events are only visible to officers.</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="card space-y-4 p-6">
        <h2 className="font-semibold">Attendance & certificate</h2>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="require_checkout" defaultChecked={event?.require_checkout ?? true} className="mt-0.5 h-4 w-4 accent-brand-700" />
          <span>
            <span className="font-medium">Require scan-out</span>
            <span className="block text-stone-500">
              Attendees must be scanned when leaving to earn a certificate. If off, scanning in is enough once the event ends.
            </span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="min_attendance_minutes">Minimum minutes attended</label>
          <input
            className="input max-w-48"
            id="min_attendance_minutes"
            name="min_attendance_minutes"
            type="number"
            min={0}
            defaultValue={event?.min_attendance_minutes ?? 0}
          />
          <p className="hint">Time between scan-in and scan-out needed for a certificate. 0 means no minimum.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-stone-200 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="self_checkin_enabled"
              defaultChecked={event?.self_checkin_enabled ?? false}
              className="mt-0.5 h-4 w-4 accent-brand-700"
            />
            <span>
              <span className="font-medium">Allow self check-in</span>
              <span className="block text-stone-500">
                Show a rotating QR code on a screen or projector. Registered attendees scan it with their own phones,
                so officers don&apos;t have to scan everyone. Officers can still scan tickets too.
              </span>
            </span>
          </label>
          <div className="pl-7">
            <label className="label" htmlFor="self_checkin_interval_seconds">QR code changes every</label>
            <select
              className="input max-w-48"
              id="self_checkin_interval_seconds"
              name="self_checkin_interval_seconds"
              defaultValue={String(event?.self_checkin_interval_seconds ?? 30)}
            >
              <option value="30">30 seconds (recommended)</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
            <p className="hint">Shorter is safer: a photo of the code forwarded to someone outside expires quickly.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="certificate_signatory">Signatory name</label>
            <input className="input" id="certificate_signatory" name="certificate_signatory" defaultValue={event?.certificate_signatory ?? ""} placeholder="e.g. Juan Dela Cruz" />
          </div>
          <div>
            <label className="label" htmlFor="certificate_signatory_title">Signatory title</label>
            <input className="input" id="certificate_signatory_title" name="certificate_signatory_title" defaultValue={event?.certificate_signatory_title ?? ""} placeholder="e.g. President" />
          </div>
        </div>
      </fieldset>

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
