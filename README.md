# Dalo: org event registration & attendance

Student orgs track attendance on paper or with Google Forms, which are easy to fake and tedious to tally for certificates. Dalo replaces them with:

- **Event registration** with capacity limits and open/close control
- **A QR ticket per attendee**, tied to their account (a 128-bit random code that can't be guessed or shared usefully)
- **Scan-in / scan-out** from any officer's phone, with a timestamped audit log
- **Automatic attendance reports**: live stats, filters, CSV export, printing
- **E-certificates** (PDF) for attendees who meet the completion rule, each with a public verification QR code

Built with Next.js 16 (App Router), Tailwind CSS 4 and Supabase (Auth + Postgres + row-level security).

## How it works

| Who | What they do |
| --- | --- |
| **Attendee** | Signs up → registers for an event → shows QR ticket at the door → scanned in and out → downloads certificate from **My tickets** |
| **Officer** | Opens **Organizer → event → Open scanner** on a phone. The first scan checks the attendee in, the next scan checks them out. |
| **Owner** | Creates the organization, adds officers by email, creates events, views reports, downloads all certificates as one PDF |
| **Anyone** | Verifies a certificate at `/verify/<certificate no.>` (or by scanning its QR) |

**Completion rule** (set per event): scanned in, plus scanned out if *Require scan-out* is on (otherwise the event must have ended), plus at least *N minutes* attended if a minimum is set.

### Why it's hard to fake

- Tickets are tied to an account, and only officers of the hosting org can scan (enforced in the database, not just the UI).
- Attendees can't modify their own registration rows. Check-in/out only happens through the `scan_ticket` database function.
- A ticket for another event, a cancelled ticket, or an unknown code is rejected and logged.
- Every scan records who scanned it and when (`scan_logs`).

## Setup

### 1. Database

The schema is in [`supabase/migrations/`](supabase/migrations/). Because the Supabase project is connected to GitHub, pushing this repo to the connected branch applies the migration automatically.

To apply it manually instead: open **Supabase Dashboard → SQL Editor**, paste the migration file, and run it.

### 2. Supabase Auth settings

In **Authentication → URL Configuration**:

- **Site URL**: your deployed URL (e.g. `https://dalo.vercel.app`)
- **Redirect URLs**: add `https://<your-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`

Email confirmation works out of the box: the confirmation link goes to `/auth/confirm`. For quick local testing you can turn off **Confirm email** under **Authentication → Providers → Email**.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # used in certificate QR codes
NEXT_PUBLIC_TIMEZONE=Asia/Manila              # time zone for entering/displaying event times
```

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, then go to **Organizer** to create your organization and first event.

> **Camera scanning requires HTTPS** (or `localhost`). To test the scanner on a phone, deploy (e.g. to Vercel) or use an HTTPS tunnel. Officers can also type or paste ticket codes manually.

### 5. Deploy (Vercel)

Import the GitHub repo in Vercel, add the four environment variables above (set `NEXT_PUBLIC_SITE_URL` to the production URL), and deploy. Then add the production `/auth/confirm` URL to Supabase's redirect URLs.

## Project structure

```
supabase/migrations/            Schema, RLS policies, RPCs (register, scan, verify…)
src/proxy.ts                    Refreshes the Supabase session; guards /dashboard, /tickets, /account
src/app/
  events/                       Public event list + event page with registration
  tickets/                      Attendee's QR tickets and certificate download
  verify/                       Public certificate verification
  dashboard/                    Organizer area: orgs, officers, events
    events/[eventId]/scan       QR scanner (camera + manual entry)
    events/[eventId]/report     Attendance report, CSV, print, bulk certificates
  actions/                      Server actions
src/lib/certificate.ts          PDF certificate generator (pdf-lib, runs in the browser)
```

## Database overview

- `profiles`: name and student number (auto-created on sign-up)
- `organizations`, `org_members` (`owner` | `officer`)
- `events`: schedule, capacity, completion rule, certificate signatory
- `registrations`: one per attendee per event; holds `ticket_code`, `certificate_code`, and check-in/out times
- `scan_logs`: audit trail of every scan, including rejected ones
- `attendance_report` view: per-attendee minutes attended and `completed` flag
- RPCs: `register_for_event`, `cancel_registration`, `scan_ticket`, `reset_attendance`, `add_org_member`, `verify_certificate`, `event_registration_count`
