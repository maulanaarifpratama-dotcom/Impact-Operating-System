-- =====================================================================
-- Impactory.id — Chunk 8 Resource Access Tracker
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
-- =====================================================================

-- ===== RESOURCE ACCESS PLATFORMS TABLE =====
create table if not exists public.resource_access_platforms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_name text not null check (platform_name in ('techsoup', 'goodstack', 'canva', 'google', 'microsoft')),
  status text not null default 'not_started' check (status in ('not_started', 'submitted', 'pending', 'approved', 'renewal_needed')),
  owner_name text,
  owner_email text,
  applied_at date,
  approved_at date,
  renewal_at date,
  benefit_notes text,
  gag_monthly_spend_usd numeric default 0,
  gag_campaigns_count integer default 0,
  gag_activated boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform_name)
);

-- Triggers for resource_access_platforms
drop trigger if exists trg_resource_access_platforms_updated_at on public.resource_access_platforms;
create trigger trg_resource_access_platforms_updated_at before update on public.resource_access_platforms
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.resource_access_platforms enable row level security;

-- Index for querying by organization_id quickly
create index if not exists idx_resource_access_platforms_org on public.resource_access_platforms(organization_id);

-- ===== RLS POLICIES FOR RESOURCE ACCESS PLATFORMS =====
drop policy if exists "resource_access_platforms_read_own_org" on public.resource_access_platforms;
create policy "resource_access_platforms_read_own_org" on public.resource_access_platforms for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "resource_access_platforms_write_own_org" on public.resource_access_platforms;
create policy "resource_access_platforms_write_own_org" on public.resource_access_platforms for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));
