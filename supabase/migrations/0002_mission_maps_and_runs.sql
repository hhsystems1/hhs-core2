-- ============================================================================
-- Mission maps/workflows + execution tracking
-- ============================================================================

create table if not exists public.mission_maps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null default 'Mission Map',
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_maps_org_idx on public.mission_maps (org_id);

alter table public.mission_nodes
  add column if not exists map_id uuid references public.mission_maps (id) on delete cascade;

alter table public.mission_edges
  add column if not exists map_id uuid references public.mission_maps (id) on delete cascade;

insert into public.mission_maps (org_id, name, description, created_by)
select orgs.id, 'Mission Control', 'Default operational workflow map.', orgs.created_by
from public.orgs
where not exists (
  select 1 from public.mission_maps maps where maps.org_id = orgs.id
);

update public.mission_nodes nodes
set map_id = maps.id
from public.mission_maps maps
where nodes.org_id = maps.org_id
  and nodes.map_id is null;

update public.mission_edges edges
set map_id = nodes.map_id
from public.mission_nodes nodes
where edges.source = nodes.id
  and edges.org_id = nodes.org_id
  and edges.map_id is null;

alter table public.mission_nodes
  alter column map_id set not null;

alter table public.mission_edges
  alter column map_id set not null;

create index if not exists mission_nodes_map_idx on public.mission_nodes (map_id);
create index if not exists mission_edges_map_idx on public.mission_edges (map_id);

create table if not exists public.mission_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  map_id uuid not null references public.mission_maps (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  trigger text not null default 'manual' check (trigger in ('manual', 'schedule', 'webhook', 'agent')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mission_node_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.mission_runs (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  map_id uuid not null references public.mission_maps (id) on delete cascade,
  node_id uuid not null references public.mission_nodes (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mission_runs_map_idx on public.mission_runs (map_id, created_at desc);
create index if not exists mission_node_runs_run_idx on public.mission_node_runs (run_id);

alter table public.mission_maps enable row level security;
alter table public.mission_runs enable row level security;
alter table public.mission_node_runs enable row level security;

create policy "mission_maps_all" on public.mission_maps
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

create policy "mission_runs_all" on public.mission_runs
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

create policy "mission_node_runs_all" on public.mission_node_runs
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  insert into public.orgs (name, slug, created_by)
  values ('My Workspace', 'ws-' || substr(replace(new.id::text, '-', ''), 1, 12), new.id)
  returning id into new_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into public.mission_maps (org_id, name, description, created_by)
  values (new_org_id, 'Mission Control', 'Default operational workflow map.', new.id);

  return new;
end;
$$;
