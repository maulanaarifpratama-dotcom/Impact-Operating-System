-- =====================================================================
-- Impactory.id — Chunk 1 Foundation
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Run. Idempotent: safe to re-run.
--   4. Bootstrap your super_admin at the bottom (see DONE section).
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ===== ENUMS =====
do $$ begin
  create type public.primary_role as enum ('foundation_lead','umkm_owner','changemaker','consultant','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_role as enum ('owner','admin','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing','active','past_due','canceled','incomplete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_tier as enum ('free','starter','premium','enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_key as enum ('grant_writer','impactory_library','grantfinder','impactory_ads');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_role as enum ('super_admin','support');
exception when duplicate_object then null; end $$;

-- ===== UTILITY: updated_at trigger =====
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== PROFILES =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  primary_role public.primary_role,
  locale text not null default 'id',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, primary_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    nullif(new.raw_user_meta_data->>'primary_role','')::public.primary_role
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== ORGANIZATIONS + MEMBERS =====
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website text,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_org_updated_at on public.organizations;
create trigger trg_org_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
alter table public.organizations enable row level security;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);
alter table public.organization_members enable row level security;

create or replace function public.is_org_member(_org_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
    where organization_id = _org_id and user_id = _user_id);
$$;

create or replace function public.get_org_role(_org_id uuid, _user_id uuid)
returns public.org_role language sql stable security definer set search_path = public as $$
  select role from public.organization_members
  where organization_id = _org_id and user_id = _user_id limit 1;
$$;

-- ===== ADMIN USERS =====
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'support',
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = _user_id);
$$;

-- ===== SUBSCRIPTIONS + INVOICES =====
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan public.plan_tier not null default 'free',
  status public.subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_subs_updated_at on public.subscriptions;
create trigger trg_subs_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
alter table public.subscriptions enable row level security;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_idr bigint not null,
  status text not null,
  invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_invoices_org on public.invoices(organization_id);
alter table public.invoices enable row level security;

create or replace function public.has_product_access(_org_id uuid, _product public.product_key)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare _plan public.plan_tier; _status public.subscription_status;
begin
  select plan, status into _plan, _status
  from public.subscriptions where organization_id = _org_id;
  if _plan is null then return false; end if;
  if _status not in ('trialing','active') then return false; end if;
  if _plan = 'free' then return _product = 'grant_writer'; end if;
  if _plan = 'starter' then return _product in ('grant_writer','impactory_library'); end if;
  return true;
end; $$;

-- ===== USAGE COUNTERS =====
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product public.product_key not null,
  period_start date not null,
  period_end date not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product, period_start)
);
drop trigger if exists trg_usage_updated_at on public.usage_counters;
create trigger trg_usage_updated_at before update on public.usage_counters
  for each row execute function public.set_updated_at();
alter table public.usage_counters enable row level security;

-- ===== AI GENERATIONS =====
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product public.product_key not null,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  cost_idr bigint,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_gen_org_created on public.ai_generations(organization_id, created_at desc);
alter table public.ai_generations enable row level security;

-- ===== AUDIT LOGS =====
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id, created_at desc);
alter table public.audit_logs enable row level security;

-- ===== NOTIFICATIONS =====
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user_unread on public.notifications(user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;

-- ===== WAITLIST =====
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  organization text,
  role text,
  interest text,
  source text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;

-- ===== RLS POLICIES =====

-- profiles
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles for select using (public.is_admin(auth.uid()));

-- organizations
drop policy if exists "orgs_members_read" on public.organizations;
create policy "orgs_members_read" on public.organizations for select
  using (public.is_org_member(id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists "orgs_create" on public.organizations;
create policy "orgs_create" on public.organizations for insert
  with check (auth.uid() = created_by);
drop policy if exists "orgs_owner_update" on public.organizations;
create policy "orgs_owner_update" on public.organizations for update
  using (public.get_org_role(id, auth.uid()) in ('owner','admin'));
drop policy if exists "orgs_owner_delete" on public.organizations;
create policy "orgs_owner_delete" on public.organizations for delete
  using (public.get_org_role(id, auth.uid()) = 'owner');

-- organization_members
drop policy if exists "members_read_own_org" on public.organization_members;
create policy "members_read_own_org" on public.organization_members for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists "members_owner_manage" on public.organization_members;
create policy "members_owner_manage" on public.organization_members for all
  using (public.get_org_role(organization_id, auth.uid()) in ('owner','admin'))
  with check (public.get_org_role(organization_id, auth.uid()) in ('owner','admin'));
drop policy if exists "members_self_insert" on public.organization_members;
create policy "members_self_insert" on public.organization_members for insert
  with check (auth.uid() = user_id);

-- subscriptions
drop policy if exists "subs_members_read" on public.subscriptions;
create policy "subs_members_read" on public.subscriptions for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists "subs_admin_write" on public.subscriptions;
create policy "subs_admin_write" on public.subscriptions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- invoices
drop policy if exists "invoices_members_read" on public.invoices;
create policy "invoices_members_read" on public.invoices for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

-- usage_counters
drop policy if exists "usage_members_read" on public.usage_counters;
create policy "usage_members_read" on public.usage_counters for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

-- ai_generations
drop policy if exists "ai_gen_members_read" on public.ai_generations;
create policy "ai_gen_members_read" on public.ai_generations for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists "ai_gen_members_insert" on public.ai_generations;
create policy "ai_gen_members_insert" on public.ai_generations for insert
  with check (auth.uid() = user_id and public.is_org_member(organization_id, auth.uid()));

-- audit_logs
drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs for select
  using (public.is_admin(auth.uid()));
drop policy if exists "audit_org_read" on public.audit_logs;
create policy "audit_org_read" on public.audit_logs for select
  using (organization_id is not null and public.is_org_member(organization_id, auth.uid()));

-- notifications
drop policy if exists "notif_own_read" on public.notifications;
create policy "notif_own_read" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notif_own_update" on public.notifications;
create policy "notif_own_update" on public.notifications for update using (auth.uid() = user_id);

-- admin_users
drop policy if exists "admins_admin_read" on public.admin_users;
create policy "admins_admin_read" on public.admin_users for select
  using (public.is_admin(auth.uid()));

-- waitlist
drop policy if exists "waitlist_anyone_insert" on public.waitlist;
create policy "waitlist_anyone_insert" on public.waitlist for insert
  to anon, authenticated with check (true);
drop policy if exists "waitlist_admin_read" on public.waitlist;
create policy "waitlist_admin_read" on public.waitlist for select
  using (public.is_admin(auth.uid()));

-- ===== DONE =====
-- After running this:
--   1. Bootstrap super_admin (replace UUID with your auth.users.id):
--      insert into public.admin_users (user_id, role)
--      values ('YOUR-USER-UUID','super_admin');
--   2. Verify: select tablename from pg_tables where schemaname='public';
--      Expect: profiles, organizations, organization_members, subscriptions,
--              invoices, usage_counters, ai_generations, audit_logs,
--              notifications, admin_users, waitlist