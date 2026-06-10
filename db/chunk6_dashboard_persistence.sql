-- =====================================================================
-- Impactory.id — Chunk 6 Dashboard & Readiness Scorecard Persistence
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
-- =====================================================================

-- ===== READINESS SCORES TABLE =====
create table if not exists public.readiness_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  scored_by uuid references auth.users(id) on delete set null,
  score_g integer not null default 0,
  score_r integer not null default 0,
  score_o integer not null default 0,
  score_w integer not null default 0,
  score_t integer not null default 0,
  score_h integer not null default 0,
  total_score integer generated always as (score_g + score_r + score_o + score_w + score_t + score_h) stored,
  details jsonb not null default '{}'::jsonb, -- holds individual item scores for the 0-5 scorecard UI
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for readiness_scores
drop trigger if exists trg_readiness_scores_updated_at on public.readiness_scores;
create trigger trg_readiness_scores_updated_at before update on public.readiness_scores
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.readiness_scores enable row level security;

-- Index for querying by organization_id quickly
create index if not exists idx_readiness_scores_org on public.readiness_scores(organization_id);


-- ===== DAY PLAN PROGRESS TABLE =====
create table if not exists public.day_plan_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phase text not null check (phase in ('g', 'r', 'o', 'w', 't', 'h')),
  item_key text not null,
  is_completed boolean not null default false,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phase, item_key)
);

-- Triggers for day_plan_progress
drop trigger if exists trg_day_plan_progress_updated_at on public.day_plan_progress;
create trigger trg_day_plan_progress_updated_at before update on public.day_plan_progress
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.day_plan_progress enable row level security;

-- Index for querying by organization_id quickly
create index if not exists idx_day_plan_progress_org on public.day_plan_progress(organization_id);


-- ===== RLS POLICIES FOR READINESS SCORES =====
drop policy if exists "readiness_scores_read_own_org" on public.readiness_scores;
create policy "readiness_scores_read_own_org" on public.readiness_scores for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "readiness_scores_write_own_org" on public.readiness_scores;
create policy "readiness_scores_write_own_org" on public.readiness_scores for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));


-- ===== RLS POLICIES FOR DAY PLAN PROGRESS =====
drop policy if exists "day_plan_progress_read_own_org" on public.day_plan_progress;
create policy "day_plan_progress_read_own_org" on public.day_plan_progress for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "day_plan_progress_write_own_org" on public.day_plan_progress;
create policy "day_plan_progress_write_own_org" on public.day_plan_progress for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));
