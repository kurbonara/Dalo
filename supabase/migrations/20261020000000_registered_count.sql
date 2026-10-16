-- Public registration count on each event, kept in sync by a trigger.
-- Attendees can't read other people's registrations, so this lets every viewer
-- see the slot count change in real time (via the events Realtime feed).

alter table public.events add column registered_count integer not null default 0;

update public.events e
set registered_count = (
  select count(*) from public.registrations r
  where r.event_id = e.id and r.status = 'registered'
);

create or replace function public.sync_registered_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events
  set registered_count = (
    select count(*) from public.registrations
    where event_id = v_event and status = 'registered'
  )
  where id = v_event;
  return null;
end;
$$;

create trigger registrations_sync_count
  after insert or delete or update of status on public.registrations
  for each row execute function public.sync_registered_count();
