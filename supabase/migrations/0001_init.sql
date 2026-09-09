-- ============================================================================
-- HHS Core 2 — Initial schema
-- Multi-user workspaces (orgs) with per-org data and RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Organizations (workspaces)
-- ----------------------------------------------------------------------------
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Org membership
-- ----------------------------------------------------------------------------
create table if not exists public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ----------------------------------------------------------------------------
-- CRM contacts
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'lead' check (status in ('lead', 'client', 'partner')),
  stage text not null default 'discovery' check (stage in ('discovery', 'proposal', 'negotiation', 'closed')),
  last_contacted date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date date,
  assignee text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Mission map nodes
-- ----------------------------------------------------------------------------
create table if not exists public.mission_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  type text not null default 'task' check (
    type in ('company', 'contact', 'lead', 'project', 'task', 'agent', 'campaign', 'automation', 'knowledge', 'system')
  ),
  label text not null,
  status text not null default 'active' check (status in ('active', 'pending', 'completed', 'alert')),
  data jsonb not null default '{}'::jsonb,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Mission map edges
-- ----------------------------------------------------------------------------
create table if not exists public.mission_edges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  source uuid not null references public.mission_nodes (id) on delete cascade,
  target uuid not null references public.mission_nodes (id) on delete cascade,
  relationship text not null default 'connects',
  created_at timestamptz not null default now()
);

create index if not exists mission_edges_source_idx on public.mission_edges (source);
create index if not exists mission_edges_target_idx on public.mission_edges (target);

-- ----------------------------------------------------------------------------
-- Membership helper
-- ----------------------------------------------------------------------------
create or replace function public.user_in_org(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_members
    where org_members.org_id = user_in_org.org_id
      and org_members.user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Auto-provision profile + personal workspace on sign-up
-- ----------------------------------------------------------------------------
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.mission_nodes enable row level security;
alter table public.mission_edges enable row level security;

-- profiles: view own or those sharing a workspace
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.org_members mine
      join public.org_members theirs on theirs.org_id = mine.org_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- orgs: members can read; creator can manage
create policy "orgs_select" on public.orgs
  for select using (user_in_org(id) or created_by = auth.uid());

create policy "orgs_insert" on public.orgs
  for insert with check (created_by = auth.uid());

create policy "orgs_update" on public.orgs
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

-- org_members: invite flow + self-onboarding
create policy "members_select" on public.org_members
  for select using (user_id = auth.uid() or user_in_org(org_id));

create policy "members_insert" on public.org_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orgs o
      where o.id = org_id and o.created_by = auth.uid()
    )
    or exists (
      select 1 from public.org_members member
      where member.org_id = org_members.org_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin')
    )
  );

create policy "members_delete" on public.org_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.org_members member
      where member.org_id = org_members.org_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin')
    )
  );

-- contacts
create policy "contacts_all" on public.contacts
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

-- projects
create policy "projects_all" on public.projects
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

-- tasks
create policy "tasks_all" on public.tasks
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

-- mission nodes
create policy "mission_nodes_all" on public.mission_nodes
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

-- mission edges
create policy "mission_edges_all" on public.mission_edges
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));

-- ----------------------------------------------------------------------------
-- Seed data for the first workspace owner (optional, adjust as needed)
-- ----------------------------------------------------------------------------
-- The personal workspace is auto-created on sign-up by handle_new_user();
-- sample rows are provided below and can be enabled once a user exists.
--
-- with ws as (select id from public.orgs limit 1)
-- insert into public.projects (org_id, name, status, progress)
-- select id, 'Storefront Launch', 'active', 65 from ws;
-- insert into public.tasks (org_id, project_id, title, description, priority, status, due_date, assignee)
-- select ws.id, p.id, 'Finalize Branding', 'Update logo and colors', 'high', 'in_progress', current_date + 1, 'Admin'
-- from ws join public.projects p on p.org_id = ws.id limit 1;