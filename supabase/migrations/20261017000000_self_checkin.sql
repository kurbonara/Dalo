-- Self check-in: officers display a rotating QR code, attendees scan it with their own phones.

alter table public.events
  add column self_checkin_enabled boolean not null default false,
  add column self_checkin_interval_seconds integer not null default 30
    check (self_checkin_interval_seconds between 15 and 600);

-- How each attendance timestamp was recorded: 'officer' (ticket scanned) or 'self' (rotating QR).
alter table public.registrations
  add column check_in_method text check (check_in_method in ('officer', 'self')),
  add column check_out_method text check (check_out_method in ('officer', 'self'));

-- Per-event secret used to derive the rotating codes. No policies: only security definer functions read it.
create table public.event_secrets (
  event_id uuid primary key references public.events (id) on delete cascade,
  secret text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
);
alter table public.event_secrets enable row level security;
revoke all on public.event_secrets from anon, authenticated;

insert into public.event_secrets (event_id) select id from public.events on conflict do nothing;

create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.event_secrets (event_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- Code for a given time window and mode ('in' | 'out').
create or replace function public.checkin_code(p_secret text, p_window bigint, p_mode text)
returns text
language sql
immutable
set search_path = ''
as $$
  select substr(encode(sha256(convert_to(p_secret || ':' || p_window || ':' || p_mode, 'UTF8')), 'hex'), 1, 16);
$$;
revoke execute on function public.checkin_code(text, bigint, text) from public, anon, authenticated;

-- Officers: the code to display right now.
create or replace function public.current_checkin_code(p_event_id uuid, p_mode text default 'in')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_secret text;
  v_window bigint;
  v_in integer;
  v_out integer;
begin
  if not public.is_event_staff(p_event_id) then
    raise exception 'You are not an officer of this event''s organization.';
  end if;
  if p_mode not in ('in', 'out') then
    raise exception 'Invalid mode.';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if not v_event.self_checkin_enabled then
    raise exception 'Self check-in is turned off for this event.';
  end if;

  select secret into v_secret from public.event_secrets where event_id = p_event_id;
  v_window := floor(extract(epoch from now()) / v_event.self_checkin_interval_seconds);

  select count(*) filter (where checked_in_at is not null),
         count(*) filter (where checked_out_at is not null)
    into v_in, v_out
  from public.registrations where event_id = p_event_id and status = 'registered';

  return jsonb_build_object(
    'code', public.checkin_code(v_secret, v_window, p_mode),
    'mode', p_mode,
    'interval', v_event.self_checkin_interval_seconds,
    'expires_at', to_timestamp((v_window + 1) * v_event.self_checkin_interval_seconds),
    'server_time', now(),
    'checked_in', v_in,
    'checked_out', v_out
  );
end;
$$;

-- Attendees: check themselves in/out with the code they scanned.
create or replace function public.self_check_in(p_event_id uuid, p_code text, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_secret text;
  v_window bigint;
  v_reg public.registrations;
  v_name text;
  v_code text := lower(trim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'You must be signed in to check in.';
  end if;
  if p_mode not in ('in', 'out') then
    return jsonb_build_object('ok', false, 'result', 'invalid', 'message', 'This QR code is not valid.');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'result', 'invalid', 'message', 'Event not found.');
  end if;
  if not v_event.self_checkin_enabled then
    return jsonb_build_object('ok', false, 'result', 'disabled',
      'message', 'Self check-in is turned off for this event. Please have an officer scan your ticket.');
  end if;
  if now() < v_event.starts_at - interval '1 hour' or now() > v_event.ends_at + interval '1 hour' then
    return jsonb_build_object('ok', false, 'result', 'closed',
      'message', 'Check-in is only open around the event''s schedule.');
  end if;

  -- Accept the current window and the one before it, so a code scanned just before it rotates still works.
  select secret into v_secret from public.event_secrets where event_id = p_event_id;
  v_window := floor(extract(epoch from now()) / v_event.self_checkin_interval_seconds);
  if v_code not in (
    public.checkin_code(v_secret, v_window, p_mode),
    public.checkin_code(v_secret, v_window - 1, p_mode)
  ) then
    insert into public.scan_logs (event_id, action, note, scanned_by)
    values (p_event_id, 'rejected', 'Self check-in with expired or invalid code', v_uid);
    return jsonb_build_object('ok', false, 'result', 'expired',
      'message', 'This QR code has expired. Scan the code on the screen again.');
  end if;

  select * into v_reg from public.registrations
  where event_id = p_event_id and user_id = v_uid for update;
  select full_name into v_name from public.profiles where id = v_uid;

  if v_reg.id is null or v_reg.status <> 'registered' then
    return jsonb_build_object('ok', false, 'result', 'not_registered',
      'message', 'You are not registered for this event.', 'name', v_name);
  end if;

  if p_mode = 'in' then
    if v_reg.checked_in_at is not null then
      return jsonb_build_object('ok', true, 'result', 'already_in',
        'message', 'You are already checked in.', 'name', v_name, 'checked_in_at', v_reg.checked_in_at);
    end if;
    update public.registrations set checked_in_at = now(), check_in_method = 'self'
    where id = v_reg.id returning * into v_reg;
    insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
    values (p_event_id, v_reg.id, 'check_in', 'Self check-in', v_uid);
    return jsonb_build_object('ok', true, 'result', 'checked_in',
      'message', 'You are checked in!', 'name', v_name, 'checked_in_at', v_reg.checked_in_at);
  end if;

  -- p_mode = 'out'
  if v_reg.checked_in_at is null then
    return jsonb_build_object('ok', false, 'result', 'not_in',
      'message', 'You never checked in, so you cannot check out.', 'name', v_name);
  end if;
  if v_reg.checked_out_at is not null then
    return jsonb_build_object('ok', true, 'result', 'already_out',
      'message', 'You are already checked out.', 'name', v_name, 'checked_out_at', v_reg.checked_out_at);
  end if;
  update public.registrations set checked_out_at = now(), check_out_method = 'self'
  where id = v_reg.id returning * into v_reg;
  insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
  values (p_event_id, v_reg.id, 'check_out', 'Self check-out', v_uid);
  return jsonb_build_object('ok', true, 'result', 'checked_out',
    'message', 'You are checked out. Thanks for attending!', 'name', v_name,
    'checked_in_at', v_reg.checked_in_at, 'checked_out_at', v_reg.checked_out_at);
end;
$$;

-- Officer scans and resets record their method too.
create or replace function public.mark_officer_method()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.checked_in_at is distinct from old.checked_in_at then
    new.check_in_method := case when new.checked_in_at is null then null else coalesce(new.check_in_method, 'officer') end;
  end if;
  if new.checked_out_at is distinct from old.checked_out_at then
    new.check_out_method := case when new.checked_out_at is null then null else coalesce(new.check_out_method, 'officer') end;
  end if;
  return new;
end;
$$;

create trigger registrations_attendance_method
  before update of checked_in_at, checked_out_at on public.registrations
  for each row execute function public.mark_officer_method();

-- Report view gains the method columns (appended, so existing queries keep working).
create or replace view public.attendance_report
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
  ) as completed,
  r.check_in_method,
  r.check_out_method
from public.registrations r
join public.events e on e.id = r.event_id
join public.profiles p on p.id = r.user_id;

revoke execute on function public.current_checkin_code(uuid, text) from public, anon;
revoke execute on function public.self_check_in(uuid, text, text) from public, anon;
grant execute on function public.current_checkin_code(uuid, text) to authenticated;
grant execute on function public.self_check_in(uuid, text, text) to authenticated;
grant select on public.attendance_report to authenticated;
