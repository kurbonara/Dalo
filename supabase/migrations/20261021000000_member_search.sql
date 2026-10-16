-- Officer suggestions: owners can search existing accounts by name, student number or email
-- when adding officers. Emails are partly hidden so owners can't harvest everyone's address.

create or replace function public.search_profiles_for_org(p_org_id uuid, p_query text)
returns table (
  user_id uuid,
  full_name text,
  student_no text,
  email_hint text,
  joined_events boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select
      char_length(trim(coalesce(p_query, ''))) as typed_length,
      -- Escape LIKE wildcards so they match literally.
      replace(replace(replace(lower(trim(coalesce(p_query, ''))), '\', '\\'), '%', '\%'), '_', '\_') as term
  )
  select
    p.id,
    p.full_name,
    p.student_no,
    case
      when p.email is null then null
      else left(split_part(p.email, '@', 1), 2)
        || repeat('•', greatest(char_length(split_part(p.email, '@', 1)) - 2, 2))
        || '@' || split_part(p.email, '@', 2)
    end,
    exists (
      select 1 from public.registrations r
      join public.events e on e.id = r.event_id
      where r.user_id = p.id and e.org_id = p_org_id
    ) as joined_events
  from public.profiles p, q
  where public.is_org_owner(p_org_id)
    and q.typed_length >= 2
    and not exists (
      select 1 from public.org_members m where m.org_id = p_org_id and m.user_id = p.id
    )
    and (
      lower(p.full_name) like '%' || q.term || '%'
      or lower(coalesce(p.email, '')) like q.term || '%'
      or lower(coalesce(p.student_no, '')) like q.term || '%'
    )
  order by
    joined_events desc,
    (lower(p.full_name) like q.term || '%') desc,
    p.full_name
  limit 8;
$$;

-- Add an officer by account (used when picking a suggestion).
create or replace function public.add_org_member_by_id(p_org_id uuid, p_user_id uuid, p_role text default 'officer')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.is_org_owner(p_org_id) then
    raise exception 'Only organization owners can add members.';
  end if;
  if p_role not in ('owner', 'officer') then
    raise exception 'Invalid role.';
  end if;
  select full_name into v_name from public.profiles where id = p_user_id;
  if not found then
    raise exception 'That account no longer exists.';
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (p_org_id, p_user_id, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
  return v_name;
end;
$$;

revoke execute on function public.search_profiles_for_org(uuid, text) from public, anon;
revoke execute on function public.add_org_member_by_id(uuid, uuid, text) from public, anon;
grant execute on function public.search_profiles_for_org(uuid, text) to authenticated;
grant execute on function public.add_org_member_by_id(uuid, uuid, text) to authenticated;
