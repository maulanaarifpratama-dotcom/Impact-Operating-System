-- Phase 2C2-C3-A: Materialization provenance and idempotency ledger
-- Creates the foundational ledger for future transactional GrantWriter -> LFA materialization.

create table public.lfa_materializations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lfa_project_id uuid null,
  source_gw_project_id uuid not null,
  source_gw_document_id uuid not null,
  source_gw_document_version integer not null,
  status text not null default 'pending',
  failure_stage text null,
  failure_code text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lfa_materializations_status_check
    check (status in ('pending', 'running', 'succeeded', 'failed', 'blocked')),
  constraint lfa_materializations_org_fk
    foreign key (organization_id) references public.organizations(id) on delete cascade,
  constraint lfa_materializations_lfa_project_fk
    foreign key (lfa_project_id) references public.lfa_projects(id) on delete cascade,
  constraint lfa_materializations_source_project_fk
    foreign key (source_gw_project_id) references public.gw_projects(id) on delete restrict,
  constraint lfa_materializations_source_document_fk
    foreign key (source_gw_document_id) references public.gw_lfa_documents(id) on delete restrict,
  constraint lfa_materializations_created_by_fk
    foreign key (created_by) references auth.users(id) on delete restrict,
  constraint lfa_materializations_org_document_key
    unique (organization_id, source_gw_document_id)
);

comment on table public.lfa_materializations is
  'Ledger of approved GrantWriter document materialization attempts into LFA projects. Historical materializations are not backfilled.';

comment on column public.lfa_materializations.source_gw_document_id is
  'Explicit source GrantWriter document ID; never implies latest/current automatically.';

comment on column public.lfa_materializations.source_gw_document_version is
  'Expected source document version snapshot captured at materialization initiation for future optimistic validation.';

comment on column public.lfa_materializations.status is
  'Machine-readable materialization status: pending, running, succeeded, failed, blocked.';

comment on column public.lfa_materializations.failure_code is
  'Safe failure/block code when materialization cannot proceed.';

comment on column public.lfa_materializations.source_gw_project_id is
  'Source GrantWriter project reference. Source document-to-project consistency is validated by future RPC, not by cross-table CHECK.';

create index lfa_materializations_org_status_idx
  on public.lfa_materializations (organization_id, status);

create index lfa_materializations_lfa_project_idx
  on public.lfa_materializations (lfa_project_id)
  where lfa_project_id is not null;

create index lfa_materializations_source_project_idx
  on public.lfa_materializations (source_gw_project_id);

alter table public.lfa_materializations enable row level security;

drop policy if exists "lfa_materializations_member_read" on public.lfa_materializations;
create policy "lfa_materializations_member_read"
  on public.lfa_materializations
  for select
  using (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "lfa_materializations_member_insert" on public.lfa_materializations;
create policy "lfa_materializations_member_insert"
  on public.lfa_materializations
  for insert
  with check (
    public.is_org_member(organization_id, auth.uid())
    and created_by = auth.uid()
  );

drop trigger if exists trg_lfa_materializations_updated_at on public.lfa_materializations;
create trigger trg_lfa_materializations_updated_at
  before update on public.lfa_materializations
  for each row execute function public.set_updated_at();
