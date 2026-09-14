-- ============================================================================
-- Persistent agent chat threads
-- Safe to run after 0001; objects are idempotent for consolidated installs.
-- ============================================================================

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_org_updated_idx on public.chat_threads (org_id, updated_at desc);
create index if not exists chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at asc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_threads_all" on public.chat_threads;
create policy "chat_threads_all" on public.chat_threads
  for all using (user_in_org(org_id) and user_id = auth.uid())
  with check (user_in_org(org_id) and user_id = auth.uid());

drop policy if exists "chat_messages_all" on public.chat_messages;
create policy "chat_messages_all" on public.chat_messages
  for all using (user_in_org(org_id) and user_id = auth.uid())
  with check (
    user_in_org(org_id)
    and user_id = auth.uid()
    and exists (
      select 1 from public.chat_threads
      where chat_threads.id = chat_messages.thread_id
        and chat_threads.org_id = chat_messages.org_id
        and chat_threads.user_id = auth.uid()
    )
  );
