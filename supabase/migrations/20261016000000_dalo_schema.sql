-- Dalo: org event registration & attendance
-- Tables, row-level security, and RPCs for registration, scanning and certificates.

-- ─────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  student_no text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, student_no, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'student_no', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this migration ran.
insert into public.profiles (id, full_name, student_no, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(u.raw_user_meta_data ->> 'student_no', ''),
  u.email
from auth.users u
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Organizations & members
-- ─────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'officer' check (role in ('owner', 'officer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);

-- ─────────────────────────────────────────────────────────────
-- Events
-- ─────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  registration_open boolean not null default true,
  is_published boolean not null default true,
  require_checkout boolean not null default true,
  min_attendance_minutes integer not null default 0 check (min_attendance_minutes >= 0),
  certificate_signatory text,
  certificate_signatory_title text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_org_idx on public.events (org_id);
create index events_starts_idx on public.events (starts_at);

-- ─────────────────────────────────────────────────────────────
-- Registrations (one QR ticket each) & scan audit log
-- ─────────────────────────────────────────────────────────────
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Secret encoded in the QR code. 128 bits of randomness, never guessable.
  ticket_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- Public code printed on the certificate for verification.
  certificate_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'registered' check (status in ('registered', 'cancelled')),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index registrations_user_idx on public.registrations (user_id);

create table public.scan_logs (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  registration_id uuid references public.registrations (id) on delete cascade,
  action text not null check (action in ('check_in', 'check_out', 'rejected', 'reset')),
  note text,
  scanned_by uuid references public.profiles (id),
  scanned_at timestamptz not null default now()
);
create index scan_logs_event_idx on public.scan_logs (event_id, scanned_at desc);

-- ─────────────────────────────────────────────────────────────
-- Helpers (security definer so policies don't recurse)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create or replace function public.is_event_staff(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.org_members m on m.org_id = e.org_id
    where e.id = p_event_id and m.user_id = auth.uid()
  );
$$;

-- Whether an attendee has earned a certificate for an event.
create or replace function public.attendance_completed(
  p_checked_in_at timestamptz,
  p_checked_out_at timestamptz,
  p_status text,
  p_require_checkout boolean,
  p_min_minutes integer,
  p_ends_at timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status = 'registered'
    and p_checked_in_at is not null
    and (
      case
        when p_require_checkout then p_checked_out_at is not null
        else p_checked_out_at is not null or now() >= p_ends_at
      end
    )
    and extract(epoch from (coalesce(p_checked_out_at, p_ends_at) - p_checked_in_at)) / 60
        >= p_min_minutes;
$$;

-- Organization creator automatically becomes its owner.
create or replace function public.handle_new_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_org_created
  after insert on public.organizations
  for each row execute function public.handle_new_org();

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.scan_logs enable row level security;

-- profiles: yourself, fellow org members, and attendees of events you staff
create policy "profiles_select" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
  or exists (
    select 1 from public.registrations r
    where r.user_id = profiles.id and public.is_event_staff(r.event_id)
  )
);
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- organizations: public directory, owners manage
create policy "orgs_select" on public.organizations for select
using (true);
create policy "orgs_insert" on public.organizations for insert to authenticated
with check (created_by = auth.uid());
create policy "orgs_update" on public.organizations for update to authenticated
using (public.is_org_owner(id)) with check (public.is_org_owner(id));
create policy "orgs_delete" on public.organizations for delete to authenticated
using (public.is_org_owner(id));

-- org_members: visible to members; owners manage (adding is via add_org_member RPC)
create policy "members_select" on public.org_members for select to authenticated
using (user_id = auth.uid() or public.is_org_member(org_id));
create policy "members_update" on public.org_members for update to authenticated
using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));
create policy "members_delete" on public.org_members for delete to authenticated
using (public.is_org_owner(org_id) or user_id = auth.uid());

-- events: published events are public; org members manage
create policy "events_select" on public.events for select
using (is_published or public.is_org_member(org_id));
create policy "events_insert" on public.events for insert to authenticated
with check (public.is_org_member(org_id));
create policy "events_update" on public.events for update to authenticated
using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "events_delete" on public.events for delete to authenticated
using (public.is_org_member(org_id));

-- registrations: attendee sees own; staff see their events'. Writes go through RPCs.
create policy "registrations_select" on public.registrations for select to authenticated
using (user_id = auth.uid() or public.is_event_staff(event_id));

-- scan logs: staff only
create policy "scan_logs_select" on public.scan_logs for select to authenticated
using (public.is_event_staff(event_id));

-- ─────────────────────────────────────────────────────────────
-- Attendance report view (respects RLS of the caller)
-- ─────────────────────────────────────────────────────────────
create view public.attendance_report
with (security_invoker = true)
as
select
  r.id as registration_id,
  r.event_id,
  r.user_id,
  p.full_name,
  p.student_no,
  p.email,
  r.status,
  r.ticket_code,
  r.certificate_code,
  r.created_at as registered_at,
  r.checked_in_at,
  r.checked_out_at,
  case
    when r.checked_in_at is not null and r.checked_out_at is not null
      then round(extract(epoch from (r.checked_out_at - r.checked_in_at)) / 60)::int
  end as minutes_attended,
  public.attendance_completed(
    r.checked_in_at, r.checked_out_at, r.status,
    e.require_checkout, e.min_attendance_minutes, e.ends_at
  ) as completed
from public.registrations r
join public.events e on e.id = r.event_id
join public.profiles p on p.id = r.user_id;

-- ─────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────

-- Register the current user for an event (capacity-safe).
create or replace function public.register_for_event(p_event_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_taken integer;
  v_reg public.registrations;
begin
  if v_uid is null then
    raise exception 'You must be signed in to register.';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or not v_event.is_published then
    raise exception 'Event not found.';
  end if;
  if not v_event.registration_open then
    raise exception 'Registration for this event is closed.';
  end if;
  if now() >= v_event.ends_at then
    raise exception 'This event has already ended.';
  end if;

  select * into v_reg from public.registrations
  where event_id = p_event_id and user_id = v_uid;
  if found and v_reg.status = 'registered' then
    return v_reg;
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken from public.registrations
    where event_id = p_event_id and status = 'registered';
    if v_taken >= v_event.capacity then
      raise exception 'This event is already full.';
    end if;
  end if;

  if v_reg.id is not null then
    update public.registrations set status = 'registered'
    where id = v_reg.id returning * into v_reg;
  else
    insert into public.registrations (event_id, user_id)
    values (p_event_id, v_uid) returning * into v_reg;
  end if;
  return v_reg;
end;
$$;

-- Cancel the current user's registration (only before check-in).
create or replace function public.cancel_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registrations
  set status = 'cancelled'
  where event_id = p_event_id
    and user_id = auth.uid()
    and checked_in_at is null;
  if not found then
    raise exception 'Nothing to cancel: you are not registered, or you have already checked in.';
  end if;
end;
$$;

-- Scan a ticket. p_mode: 'auto' (in, then out), 'in', or 'out'.
create or replace function public.scan_ticket(
  p_event_id uuid,
  p_ticket_code text,
  p_mode text default 'auto'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_reg public.registrations;
  v_name text;
  v_student text;
  v_result text;
  v_code text := lower(trim(coalesce(p_ticket_code, '')));
begin
  if not public.is_event_staff(p_event_id) then
    raise exception 'You are not an officer of this event''s organization.';
  end if;

  -- Accept either the raw code or a full ticket URL/payload ending in the code.
  v_code := regexp_replace(v_code, '^.*[^0-9a-f]', '');

  select * into v_reg from public.registrations
  where ticket_code = v_code for update;

  if not found then
    insert into public.scan_logs (event_id, action, note, scanned_by)
    values (p_event_id, 'rejected', 'Unknown ticket', v_uid);
    return jsonb_build_object('ok', false, 'result', 'invalid',
      'message', 'Invalid ticket. This QR code is not a Dalo ticket.');
  end if;

  select full_name, student_no into v_name, v_student
  from public.profiles where id = v_reg.user_id;

  if v_reg.event_id <> p_event_id then
    insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
    values (p_event_id, v_reg.id, 'rejected', 'Ticket for a different event', v_uid);
    return jsonb_build_object('ok', false, 'result', 'wrong_event',
      'message', 'This ticket is for a different event.', 'name', v_name);
  end if;

  if v_reg.status <> 'registered' then
    insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
    values (p_event_id, v_reg.id, 'rejected', 'Registration cancelled', v_uid);
    return jsonb_build_object('ok', false, 'result', 'cancelled',
      'message', 'This registration was cancelled.', 'name', v_name);
  end if;

  if p_mode = 'in' or (p_mode = 'auto' and v_reg.checked_in_at is null) then
    if v_reg.checked_in_at is not null then
      return jsonb_build_object('ok', false, 'result', 'already_in',
        'message', 'Already checked in.', 'checked_in_at', v_reg.checked_in_at,
        'name', v_name, 'student_no', v_student);
    end if;
    update public.registrations set checked_in_at = now()
    where id = v_reg.id returning * into v_reg;
    v_result := 'checked_in';
  else
    if v_reg.checked_in_at is null then
      return jsonb_build_object('ok', false, 'result', 'not_in',
        'message', 'Cannot check out: attendee never checked in.',
        'name', v_name, 'student_no', v_student);
    end if;
    if v_reg.checked_out_at is not null then
      return jsonb_build_object('ok', false, 'result', 'already_out',
        'message', 'Already checked out.', 'name', v_name, 'student_no', v_student);
    end if;
    -- Guard against an accidental double scan right after check-in.
    if p_mode = 'auto' and now() - v_reg.checked_in_at < interval '1 minute' then
      return jsonb_build_object('ok', false, 'result', 'too_soon',
        'message', 'Just checked in. Scan again later to check out.',
        'name', v_name, 'student_no', v_student);
    end if;
    update public.registrations set checked_out_at = now()
    where id = v_reg.id returning * into v_reg;
    v_result := 'checked_out';
  end if;

  insert into public.scan_logs (event_id, registration_id, action, scanned_by)
  values (p_event_id, v_reg.id, case when v_result = 'checked_in' then 'check_in' else 'check_out' end, v_uid);

  return jsonb_build_object(
    'ok', true,
    'result', v_result,
    'message', case when v_result = 'checked_in' then 'Checked in' else 'Checked out' end,
    'name', v_name,
    'student_no', v_student,
    'checked_in_at', v_reg.checked_in_at,
    'checked_out_at', v_reg.checked_out_at
  );
end;
$$;

-- Undo a check-in/out (staff correction).
create or replace function public.reset_attendance(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  select event_id into v_event from public.registrations where id = p_registration_id;
  if v_event is null or not public.is_event_staff(v_event) then
    raise exception 'Not allowed.';
  end if;
  update public.registrations
  set checked_in_at = null, checked_out_at = null
  where id = p_registration_id;
  insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
  values (v_event, p_registration_id, 'reset', 'Attendance reset by officer', auth.uid());
end;
$$;

-- Owner adds an officer by email (the person must already have a Dalo account).
create or replace function public.add_org_member(p_org_id uuid, p_email text, p_role text default 'officer')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_org_owner(p_org_id) then
    raise exception 'Only organization owners can add members.';
  end if;
  if p_role not in ('owner', 'officer') then
    raise exception 'Invalid role.';
  end if;
  select id into v_user from public.profiles where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No Dalo account uses that email. Ask them to sign up first.';
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (p_org_id, v_user, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
end;
$$;

-- Public certificate verification.
create or replace function public.verify_certificate(p_code text)
returns table (
  full_name text,
  event_title text,
  org_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  completed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.full_name,
    e.title,
    o.name,
    e.starts_at,
    e.ends_at,
    e.venue,
    public.attendance_completed(
      r.checked_in_at, r.checked_out_at, r.status,
      e.require_checkout, e.min_attendance_minutes, e.ends_at
    )
  from public.registrations r
  join public.events e on e.id = r.event_id
  join public.organizations o on o.id = e.org_id
  join public.profiles p on p.id = r.user_id
  where r.certificate_code = upper(trim(p_code));
$$;

-- Public registration counts (attendee lists stay private).
create or replace function public.event_registration_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.registrations
  where event_id = p_event_id and status = 'registered';
$$;

-- ─────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.register_for_event(uuid) from anon, public;
revoke execute on function public.cancel_registration(uuid) from anon, public;
revoke execute on function public.scan_ticket(uuid, text, text) from anon, public;
revoke execute on function public.reset_attendance(uuid) from anon, public;
revoke execute on function public.add_org_member(uuid, text, text) from anon, public;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_registration(uuid) to authenticated;
grant execute on function public.scan_ticket(uuid, text, text) to authenticated;
grant execute on function public.reset_attendance(uuid) to authenticated;
grant execute on function public.add_org_member(uuid, text, text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.event_registration_count(uuid) to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.events to anon;
grant select, insert, update, delete on
  public.profiles, public.organizations, public.org_members,
  public.events, public.registrations, public.scan_logs
  to authenticated;
grant select on public.attendance_report to authenticated;
