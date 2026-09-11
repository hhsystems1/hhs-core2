-- ============================================================================
-- Server-side agent provider configs for mission runners
-- ============================================================================

create table if not exists public.agent_provider_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null default 'Default Agent Provider',
  provider text not null check (provider in ('openai', 'openrouter', 'ollama-local', 'ollama-cloud')),
  base_url text not null,
  model text not null,
  api_key text,
  system_prompt text not null default 'You are the HHS Core 2 mission control agent. Be concise, practical, and execute the workflow step you are assigned.',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_provider_configs_org_idx on public.agent_provider_configs (org_id);

create unique index if not exists agent_provider_configs_one_default_idx
  on public.agent_provider_configs (org_id)
  where is_default;

alter table public.agent_provider_configs enable row level security;

create policy "agent_provider_configs_all" on public.agent_provider_configs
  for all using (user_in_org(org_id)) with check (user_in_org(org_id));
