-- =====================================================================
-- Impactory.id — Chunk 10 Monthly Operating Review (MOR)
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
-- =====================================================================

create table if not exists public.mor_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_date date not null default current_date,
  facilitator_id uuid references auth.users(id) on delete set null,
  recap_notes text,
  performance_notes text,
  people_notes text,
  plan_priorities jsonb not null default '[]'::jsonb, -- array of {priority, owner, deadline}
  risk_notes text,
  decisions jsonb not null default '[]'::jsonb, -- array of {decision, owner, deadline, status}
  next_mor_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for mor_sessions
drop trigger if exists trg_mor_sessions_updated_at on public.mor_sessions;
create trigger trg_mor_sessions_updated_at before update on public.mor_sessions
  for each row execute function public.set_updated_at();

-- Enable RLS for mor_sessions
alter table public.mor_sessions enable row level security;
create index if not exists idx_mor_sessions_org on public.mor_sessions(organization_id);

-- RLS POLICIES FOR MOR SESSIONS
drop policy if exists "mor_sessions_read_own_org" on public.mor_sessions;
create policy "mor_sessions_read_own_org" on public.mor_sessions for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "mor_sessions_write_own_org" on public.mor_sessions;
create policy "mor_sessions_write_own_org" on public.mor_sessions for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));
