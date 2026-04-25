-- =====================================================================
-- Impactory.id — Chunk 2: Grant Writer
-- HOW TO RUN:
--   1. Make sure db/chunk1_foundation.sql is applied first.
--   2. Open Supabase Dashboard → SQL Editor → New query
--   3. Paste this entire file. Run. Idempotent (safe to re-run).
-- =====================================================================

-- ===== ENUMS =====
do $$ begin
  create type public.gw_project_status as enum ('draft','generating','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gw_donor_standard as enum ('un_oecd_dac','world_bank','usaid','eu','generic');
exception when duplicate_object then null; end $$;

-- ===== TABLES =====

-- gw_projects: 1 baris per inisiatif/proposal yang user buat
create table if not exists public.gw_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  summary text,
  sector text,
  geography text,
  duration_months integer,
  budget_idr bigint,
  donor_standard public.gw_donor_standard not null default 'un_oecd_dac',
  target_donor text,
  status public.gw_project_status not null default 'draft',
  current_step integer not null default 1,
  -- Wizard state (autosaved). Schema is loose by design (it's a working draft).
  wizard_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gw_projects_org on public.gw_projects(organization_id, updated_at desc);
create index if not exists idx_gw_projects_user on public.gw_projects(created_by, updated_at desc);

drop trigger if exists trg_gw_projects_updated_at on public.gw_projects;
create trigger trg_gw_projects_updated_at before update on public.gw_projects
  for each row execute function public.set_updated_at();
alter table public.gw_projects enable row level security;

-- gw_lfa_documents: hasil generate LFA matrix (versi-able)
create table if not exists public.gw_lfa_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gw_projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by uuid not null references auth.users(id) on delete restrict,
  version integer not null default 1,
  -- Full LFA matrix as structured JSON (goal/outcomes/outputs/activities + indicators + assumptions + risks)
  matrix jsonb not null,
  -- Markdown rendering of the donor-ready proposal
  proposal_markdown text,
  -- Metadata about generation
  model text,
  donor_standard public.gw_donor_standard not null default 'un_oecd_dac',
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_gw_lfa_project on public.gw_lfa_documents(project_id, created_at desc);
create unique index if not exists idx_gw_lfa_current
  on public.gw_lfa_documents(project_id) where is_current;
alter table public.gw_lfa_documents enable row level security;

-- gw_proposals: optional polished/exported proposal records
create table if not exists public.gw_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gw_projects(id) on delete cascade,
  lfa_document_id uuid references public.gw_lfa_documents(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  format text not null default 'markdown', -- markdown | pdf | docx
  content_markdown text,
  file_url text,
  exported_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_gw_proposals_project on public.gw_proposals(project_id, created_at desc);
alter table public.gw_proposals enable row level security;

-- ===== RLS POLICIES =====

-- gw_projects
drop policy if exists "gw_projects_member_read" on public.gw_projects;
create policy "gw_projects_member_read" on public.gw_projects for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "gw_projects_member_insert" on public.gw_projects;
create policy "gw_projects_member_insert" on public.gw_projects for insert
  with check (auth.uid() = created_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_projects_member_update" on public.gw_projects;
create policy "gw_projects_member_update" on public.gw_projects for update
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_projects_owner_admin_delete" on public.gw_projects;
create policy "gw_projects_owner_admin_delete" on public.gw_projects for delete
  using (
    public.get_org_role(organization_id, auth.uid()) in ('owner','admin')
    or auth.uid() = created_by
  );

-- gw_lfa_documents
drop policy if exists "gw_lfa_member_read" on public.gw_lfa_documents;
create policy "gw_lfa_member_read" on public.gw_lfa_documents for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "gw_lfa_member_insert" on public.gw_lfa_documents;
create policy "gw_lfa_member_insert" on public.gw_lfa_documents for insert
  with check (auth.uid() = generated_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_lfa_member_update" on public.gw_lfa_documents;
create policy "gw_lfa_member_update" on public.gw_lfa_documents for update
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_lfa_member_delete" on public.gw_lfa_documents;
create policy "gw_lfa_member_delete" on public.gw_lfa_documents for delete
  using (public.get_org_role(organization_id, auth.uid()) in ('owner','admin'));

-- gw_proposals
drop policy if exists "gw_prop_member_read" on public.gw_proposals;
create policy "gw_prop_member_read" on public.gw_proposals for select
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "gw_prop_member_insert" on public.gw_proposals;
create policy "gw_prop_member_insert" on public.gw_proposals for insert
  with check (auth.uid() = created_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_prop_member_update" on public.gw_proposals;
create policy "gw_prop_member_update" on public.gw_proposals for update
  using (public.is_org_member(organization_id, auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "gw_prop_member_delete" on public.gw_proposals;
create policy "gw_prop_member_delete" on public.gw_proposals for delete
  using (public.get_org_role(organization_id, auth.uid()) in ('owner','admin'));

-- ===== HELPER: ensure single is_current per project =====
create or replace function public.gw_lfa_set_current()
returns trigger language plpgsql as $$
begin
  if NEW.is_current then
    update public.gw_lfa_documents
      set is_current = false
      where project_id = NEW.project_id and id <> NEW.id and is_current = true;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_gw_lfa_set_current on public.gw_lfa_documents;
create trigger trg_gw_lfa_set_current after insert or update of is_current on public.gw_lfa_documents
  for each row when (NEW.is_current) execute function public.gw_lfa_set_current();

-- ===== DONE =====
-- Verify:
--   select tablename from pg_tables where schemaname='public' and tablename like 'gw_%';
--   Expected: gw_projects, gw_lfa_documents, gw_proposals