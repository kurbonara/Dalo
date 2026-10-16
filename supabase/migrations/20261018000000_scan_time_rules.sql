-- Attendance time rules, for both officer scans and self check-in:
--   check-in:  from 1 hour before the event starts until it ends
--   check-out: until 1 hour after the event ends

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
  v_event public.events;
  v_reg public.registrations;
  v_name text;
  v_student text;
  v_result text;
  v_wait integer;
  v_code text := lower(trim(coalesce(p_ticket_code, '')));
begin
  if not public.is_event_staff(p_event_id) then
    raise exception 'You are not an officer of this event''s organization.';
  end if;
  select * into v_event from public.events where id = p_event_id;

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
    if now() < v_event.starts_at - interval '1 hour' then
      return jsonb_build_object('ok', false, 'result', 'closed',
        'message', 'Check-in opens 1 hour before the event starts.', 'name', v_name, 'student_no', v_student);
    end if;
    if now() > v_event.ends_at then
      insert into public.scan_logs (event_id, registration_id, action, note, scanned_by)
      values (p_event_id, v_reg.id, 'rejected', 'Check-in after event ended', v_uid);
      return jsonb_build_object('ok', false, 'result', 'closed',
        'message', 'Check-in is closed: this event has already ended.', 'name', v_name, 'student_no', v_student);
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
    if now() > v_event.ends_at + interval '1 hour' then
      return jsonb_build_object('ok', false, 'result', 'closed',
        'message', 'Check-out closed 1 hour after the event ended.', 'name', v_name, 'student_no', v_student);
    end if;
    -- Guard against an accidental double scan right after check-in.
    -- Once the event has ended, anyone scanning is leaving, so the guard no longer applies.
    v_wait := ceil(60 - extract(epoch from (now() - v_reg.checked_in_at)))::int;
    if p_mode = 'auto' and v_wait > 0 and now() <= v_event.ends_at then
      return jsonb_build_object('ok', false, 'result', 'too_soon',
        'message', 'Checked in just now. Wait ' || v_wait || 's to check out, or switch to Check-out only.',
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
  if now() < v_event.starts_at - interval '1 hour' then
    return jsonb_build_object('ok', false, 'result', 'closed',
      'message', 'Check-in opens 1 hour before the event starts.');
  end if;
  if p_mode = 'in' and now() > v_event.ends_at then
    return jsonb_build_object('ok', false, 'result', 'closed',
      'message', 'Check-in is closed: this event has already ended.');
  end if;
  if p_mode = 'out' and now() > v_event.ends_at + interval '1 hour' then
    return jsonb_build_object('ok', false, 'result', 'closed',
      'message', 'Check-out closed 1 hour after the event ended.');
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
