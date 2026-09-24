-- ============================================================================
-- Securely add an existing account to a shared workspace by email.
-- ============================================================================

create or replace function public.add_org_member_by_email(target_org_id uuid, target_email text)
returns table (member_user_id uuid, member_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not exists (
    select 1 from public.org_members
    where org_id = target_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can add members.';
  end if;

  select id into target_user_id
  from public.profiles
  where lower(email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No account exists for that email.';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (target_org_id, target_user_id, 'member')
  on conflict (org_id, user_id) do nothing;

  return query
    select user_id, role
    from public.org_members
    where org_id = target_org_id and user_id = target_user_id;
end;
$$;

grant execute on function public.add_org_member_by_email(uuid, text) to authenticated;
revoke execute on function public.add_org_member_by_email(uuid, text) from public, anon;
