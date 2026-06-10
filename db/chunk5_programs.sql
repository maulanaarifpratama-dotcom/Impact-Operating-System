-- =====================================================================
-- Impactory.id — Chunk 5 Programs & Metrics (Migration only, no UI yet)
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
-- =====================================================================

-- ===== PROGRAMS TABLE =====
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  budget numeric(15, 2) not null default 0.00,
  start_date date,
  end_date date,
  status text not null default 'draft', -- 'draft' | 'active' | 'completed' | 'on_hold'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for programs
drop trigger if exists trg_programs_updated_at on public.programs;
create trigger trg_programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.programs enable row level security;

-- Index for querying by organization_id quickly
create index if not exists idx_programs_org on public.programs(organization_id);


-- ===== PROGRAM METRICS TABLE =====
create table if not exists public.program_metrics (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  unit text not null default 'orang', -- e.g. 'orang', 'ton', 'paket', 'idr'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for program_metrics
drop trigger if exists trg_program_metrics_updated_at on public.program_metrics;
create trigger trg_program_metrics_updated_at before update on public.program_metrics
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.program_metrics enable row level security;

-- Index for querying by program_id and organization_id quickly
create index if not exists idx_program_metrics_prog on public.program_metrics(program_id);
create index if not exists idx_program_metrics_org on public.program_metrics(organization_id);


-- ===== RLS POLICIES FOR PROGRAMS =====
drop policy if exists "programs_read_own_org" on public.programs;
create policy "programs_read_own_org" on public.programs for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "programs_write_own_org" on public.programs;
create policy "programs_write_own_org" on public.programs for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));


-- ===== RLS POLICIES FOR PROGRAM METRICS =====
drop policy if exists "metrics_read_own_org" on public.program_metrics;
create policy "metrics_read_own_org" on public.program_metrics for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "metrics_write_own_org" on public.program_metrics;
create policy "metrics_write_own_org" on public.program_metrics for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));
