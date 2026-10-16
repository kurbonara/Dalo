-- Realtime: push row changes to open pages so they update without a manual refresh.
-- Row-level security still applies: each subscriber only receives rows they're allowed to read.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registrations'
  ) then
    alter publication supabase_realtime add table public.registrations;
  end if;
end;
$$;
