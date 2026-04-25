-- =====================================================================
-- Chunk 3 — Grant Writer AI Chat
-- Per-project chat thread + messages (RLS lewat gw_projects -> org member)
-- =====================================================================

-- Roles enum sudah ada (assistant/user). Pakai text + check constraint
-- supaya fleksibel untuk 'system' dan future 'tool'.

create table if not exists public.gw_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gw_projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  -- Optional structured tool-call metadata for future AI wiring
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  -- For UI rendering: 'pending' | 'streaming' | 'complete' | 'error'
  status text not null default 'complete' check (status in ('pending', 'streaming', 'complete', 'error')),
  -- Token & model stats (nullable, filled when wired to real AI)
  model text,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists gw_chat_messages_project_created_idx
  on public.gw_chat_messages (project_id, created_at);
create index if not exists gw_chat_messages_org_idx
  on public.gw_chat_messages (organization_id);

alter table public.gw_chat_messages enable row level security;

-- SELECT: any org member of the project's org can read messages
create policy "gw_chat_messages_select_org_member"
on public.gw_chat_messages
for select
to authenticated
using (public.is_org_member(organization_id, auth.uid()));

-- INSERT: must be org member, must own user_id, project must belong to org
create policy "gw_chat_messages_insert_org_member"
on public.gw_chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id, auth.uid())
  and exists (
    select 1 from public.gw_projects p
    where p.id = project_id and p.organization_id = gw_chat_messages.organization_id
  )
);

-- UPDATE: only the message author can update (for streaming status & content)
create policy "gw_chat_messages_update_owner"
on public.gw_chat_messages
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE: org admins/owners or message author
create policy "gw_chat_messages_delete_owner_or_admin"
on public.gw_chat_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.get_org_role(organization_id, auth.uid()) in ('owner', 'admin')
);