-- =====================================================================
-- Impactory.id — Chunk 9 Donor CRM
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
-- =====================================================================

-- ===== DONORS TABLE =====
create table if not exists public.donors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  whatsapp text,
  city text,
  source text not null default 'campaign' check (source in ('campaign', 'referral', 'organic', 'event', 'corporate', 'other')),
  campaign_source text,
  journey_stage text not null default 'awareness' check (journey_stage in ('awareness', 'interest', 'trust', 'donation', 'thank_you', 'impact_update', 'repeat_donation')),
  first_donation_date date,
  total_cumulative numeric(15,2) not null default 0,
  issue_interest text[] not null default '{}'::text[],
  followup_status text not null default 'not_contacted' check (followup_status in ('not_contacted', 'contacted', 'responded', 'no_response')),
  last_contact_date date,
  next_action text,
  next_action_due date,
  donor_type text not null default 'one_time' check (donor_type in ('one_time', 'recurring', 'corporate')),
  recurring_amount numeric(15,2),
  recurring_frequency text check (recurring_frequency in ('monthly', 'quarterly', 'yearly')),
  tags text[] not null default '{}'::text[],
  notes text,
  is_at_risk boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for donors
drop trigger if exists trg_donors_updated_at on public.donors;
create trigger trg_donors_updated_at before update on public.donors
  for each row execute function public.set_updated_at();

-- Enable RLS for donors
alter table public.donors enable row level security;
create index if not exists idx_donors_org on public.donors(organization_id);

-- ===== DONATIONS TABLE =====
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donor_id uuid not null references public.donors(id) on delete cascade,
  campaign_name text,
  amount numeric(15,2) not null check (amount >= 0),
  donation_date date not null default current_date,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for donations
drop trigger if exists trg_donations_updated_at on public.donations;
create trigger trg_donations_updated_at before update on public.donations
  for each row execute function public.set_updated_at();

-- Enable RLS for donations
alter table public.donations enable row level security;
create index if not exists idx_donations_org on public.donations(organization_id);
create index if not exists idx_donations_donor on public.donations(donor_id);

-- ===== DONOR FOLLOWUPS TABLE =====
create table if not exists public.donor_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donor_id uuid not null references public.donors(id) on delete cascade,
  contact_date date not null default current_date,
  channel text not null check (channel in ('whatsapp', 'email', 'phone', 'meeting', 'other')),
  summary text,
  outcome text,
  next_action text,
  pic_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for donor_followups
drop trigger if exists trg_donor_followups_updated_at on public.donor_followups;
create trigger trg_donor_followups_updated_at before update on public.donor_followups
  for each row execute function public.set_updated_at();

-- Enable RLS for donor_followups
alter table public.donor_followups enable row level security;
create index if not exists idx_donor_followups_org on public.donor_followups(organization_id);
create index if not exists idx_donor_followups_donor on public.donor_followups(donor_id);

-- ===== RLS POLICIES FOR DONORS =====
drop policy if exists "donors_read_own_org" on public.donors;
create policy "donors_read_own_org" on public.donors for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "donors_write_own_org" on public.donors;
create policy "donors_write_own_org" on public.donors for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

-- ===== RLS POLICIES FOR DONATIONS =====
drop policy if exists "donations_read_own_org" on public.donations;
create policy "donations_read_own_org" on public.donations for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "donations_write_own_org" on public.donations;
create policy "donations_write_own_org" on public.donations for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

-- ===== RLS POLICIES FOR DONOR FOLLOWUPS =====
drop policy if exists "donor_followups_read_own_org" on public.donor_followups;
create policy "donor_followups_read_own_org" on public.donor_followups for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "donor_followups_write_own_org" on public.donor_followups;
create policy "donor_followups_write_own_org" on public.donor_followups for all
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));
