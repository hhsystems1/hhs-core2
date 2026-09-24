-- ============================================================================
-- Move provider secrets out of the client-readable provider configuration table.
-- Run after 0001 (and after 0003 if it was applied separately).
-- ============================================================================

create table if not exists public.agent_provider_secrets (
  config_id uuid primary key references public.agent_provider_configs (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_provider_secrets_org_idx on public.agent_provider_secrets (org_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agent_provider_configs'
      and column_name = 'api_key'
  ) then
    insert into public.agent_provider_secrets (config_id, org_id, api_key)
      select id, org_id, api_key
      from public.agent_provider_configs
      where api_key is not null and length(trim(api_key)) > 0
      on conflict (config_id) do update
        set api_key = excluded.api_key, updated_at = now();

    alter table public.agent_provider_configs drop column api_key;
  end if;
end
$$;

alter table public.agent_provider_secrets enable row level security;

drop policy if exists "agent_provider_secrets_select" on public.agent_provider_secrets;
drop policy if exists "agent_provider_secrets_write" on public.agent_provider_secrets;

-- There is intentionally no client SELECT policy. The server-side runner uses
-- the service role, and the write function below is the only authenticated path.

create or replace function public.set_agent_provider_secret(
  target_config_id uuid,
  target_org_id uuid,
  target_api_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.org_members
    where org_id = target_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  ) then
    raise exception 'Only workspace owners and admins can manage provider secrets.';
  end if;

  if not exists (
    select 1 from public.agent_provider_configs
    where id = target_config_id and org_id = target_org_id
  ) then
    raise exception 'Provider configuration not found.';
  end if;

  if target_api_key is null or length(trim(target_api_key)) = 0 then
    raise exception 'Provider API key cannot be empty.';
  end if;

  insert into public.agent_provider_secrets (config_id, org_id, api_key, updated_at)
  values (target_config_id, target_org_id, trim(target_api_key), now())
  on conflict (config_id) do update
    set api_key = excluded.api_key, org_id = excluded.org_id, updated_at = now();
end;
$$;

grant execute on function public.set_agent_provider_secret(uuid, uuid, text) to authenticated;
revoke execute on function public.set_agent_provider_secret(uuid, uuid, text) from public, anon;

drop policy if exists "agent_provider_configs_all" on public.agent_provider_configs;
drop policy if exists "agent_provider_configs_select" on public.agent_provider_configs;
drop policy if exists "agent_provider_configs_insert" on public.agent_provider_configs;
drop policy if exists "agent_provider_configs_update" on public.agent_provider_configs;
drop policy if exists "agent_provider_configs_delete" on public.agent_provider_configs;

create policy "agent_provider_configs_select" on public.agent_provider_configs
  for select using (user_in_org(org_id));

create policy "agent_provider_configs_insert" on public.agent_provider_configs
  for insert with check (
    exists (
      select 1 from public.org_members
      where org_id = agent_provider_configs.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "agent_provider_configs_update" on public.agent_provider_configs
  for update using (
    exists (
      select 1 from public.org_members
      where org_id = agent_provider_configs.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  ) with check (org_id = agent_provider_configs.org_id);

create policy "agent_provider_configs_delete" on public.agent_provider_configs
  for delete using (
    exists (
      select 1 from public.org_members
      where org_id = agent_provider_configs.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
