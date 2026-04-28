-- =====================================================================
-- Impactory.id — Chunk 4: AI Extras (Foundry-ready)
-- HOW TO RUN:
--   1. Make sure chunk1, chunk2, chunk3 already applied.
--   2. Open Supabase Dashboard → SQL Editor → New query → paste this file.
--   3. Run. Idempotent (safe to re-run).
--
-- WHAT THIS ADDS:
--   * pgvector extension + vector indexes
--   * library_documents + library_chunks  (RAG for Impactory Library)
--   * grants_catalog                       (semantic search for Grantfinder)
--   * ads_briefs + ads_generations         (Impactory Ads copy generator)
--   * match_library_chunks() RPC           (vector similarity search)
--   * match_grants() RPC                   (semantic grant matching)
-- =====================================================================

create extension if not exists "vector";

-- ===== ENUMS =====
do $$ begin
  create type public.library_doc_status as enum ('uploaded','processing','indexed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ads_platform as enum ('meta','google','tiktok','linkedin','generic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ads_objective as enum ('awareness','traffic','conversions','leads','engagement','donation');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- IMPACTORY LIBRARY  (RAG)
-- =====================================================================

create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  source_type text not null default 'upload',
  source_url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  status public.library_doc_status not null default 'uploaded',
  status_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_library_docs_org on public.library_documents(organization_id, created_at desc);
create index if not exists idx_library_docs_status on public.library_documents(status);

drop trigger if exists trg_library_docs_updated_at on public.library_documents;
create trigger trg_library_docs_updated_at
before update on public.library_documents
for each row execute function public.set_updated_at();

alter table public.library_documents enable row level security;

create table if not exists public.library_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.library_documents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index if not exists idx_library_chunks_doc on public.library_chunks(document_id);
create index if not exists idx_library_chunks_embedding
  on public.library_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.library_chunks enable row level security;

-- =====================================================================
-- GRANTFINDER  (semantic search over donor opportunities)
-- =====================================================================

create table if not exists public.grants_catalog (
  id uuid primary key default gen_random_uuid(),
  donor_name text not null,
  title text not null,
  summary text,
  description text,
  sectors text[] not null default '{}',
  geographies text[] not null default '{}',
  min_amount_idr bigint,
  max_amount_idr bigint,
  currency text not null default 'IDR',
  application_url text,
  deadline date,
  eligibility text,
  source_url text,
  is_active boolean not null default true,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_grants_active on public.grants_catalog(is_active, deadline);
create index if not exists idx_grants_sectors on public.grants_catalog using gin (sectors);
create index if not exists idx_grants_geos on public.grants_catalog using gin (geographies);
create index if not exists idx_grants_embedding
  on public.grants_catalog
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop trigger if exists trg_grants_updated_at on public.grants_catalog;
create trigger trg_grants_updated_at
before update on public.grants_catalog
for each row execute function public.set_updated_at();

alter table public.grants_catalog enable row level security;

create table if not exists public.grantfinder_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  filters jsonb not null default '{}'::jsonb,
  result_grant_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_gf_searches_org on public.grantfinder_searches(organization_id, created_at desc);

alter table public.grantfinder_searches enable row level security;

-- =====================================================================
-- IMPACTORY ADS  (copy generator)
-- =====================================================================

create table if not exists public.ads_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  campaign_name text not null,
  product_or_cause text not null,
  audience text,
  objective public.ads_objective not null default 'awareness',
  platforms public.ads_platform[] not null default '{meta}',
  tone text,
  key_message text,
  call_to_action text,
  language text not null default 'id',
  budget_idr bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ads_briefs_org on public.ads_briefs(organization_id, created_at desc);

drop trigger if exists trg_ads_briefs_updated_at on public.ads_briefs;
create trigger trg_ads_briefs_updated_at
before update on public.ads_briefs
for each row execute function public.set_updated_at();

alter table public.ads_briefs enable row level security;

create table if not exists public.ads_generations (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.ads_briefs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by uuid not null references auth.users(id) on delete restrict,
  platform public.ads_platform not null,
  variants jsonb not null default '[]'::jsonb,
  model text,
  prompt_tokens int,
  completion_tokens int,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ads_gens_brief on public.ads_generations(brief_id, created_at desc);
create index if not exists idx_ads_gens_org on public.ads_generations(organization_id, created_at desc);

alter table public.ads_generations enable row level security;

-- =====================================================================
-- RPC: vector similarity search
-- =====================================================================

create or replace function public.match_library_chunks(
  _org_id uuid,
  _query_embedding vector(1536),
  _match_count int default 6,
  _min_similarity float default 0.5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as chunk_id,
    c.document_id,
    d.title as document_title,
    c.content,
    1 - (c.embedding <=> _query_embedding) as similarity
  from public.library_chunks c
  join public.library_documents d on d.id = c.document_id
  where c.organization_id = _org_id
    and c.embedding is not null
    and (1 - (c.embedding <=> _query_embedding)) >= _min_similarity
    and public.is_org_member(_org_id, auth.uid())
  order by c.embedding <=> _query_embedding
  limit _match_count;
$$;

create or replace function public.match_grants(
  _query_embedding vector(1536),
  _match_count int default 10,
  _min_similarity float default 0.3,
  _sectors text[] default null,
  _geographies text[] default null
)
returns table (
  grant_id uuid,
  donor_name text,
  title text,
  summary text,
  sectors text[],
  geographies text[],
  deadline date,
  application_url text,
  similarity float
)
language sql
stable
as $$
  select
    g.id as grant_id,
    g.donor_name,
    g.title,
    g.summary,
    g.sectors,
    g.geographies,
    g.deadline,
    g.application_url,
    1 - (g.embedding <=> _query_embedding) as similarity
  from public.grants_catalog g
  where g.is_active
    and g.embedding is not null
    and (1 - (g.embedding <=> _query_embedding)) >= _min_similarity
    and (_sectors is null or g.sectors && _sectors)
    and (_geographies is null or g.geographies && _geographies)
  order by g.embedding <=> _query_embedding
  limit _match_count;
$$;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

drop policy if exists "lib_docs_member_read" on public.library_documents;
create policy "lib_docs_member_read" on public.library_documents for select
using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "lib_docs_member_insert" on public.library_documents;
create policy "lib_docs_member_insert" on public.library_documents for insert
with check (auth.uid() = uploaded_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "lib_docs_member_update" on public.library_documents;
create policy "lib_docs_member_update" on public.library_documents for update
using (public.is_org_member(organization_id, auth.uid()))
with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "lib_docs_owner_delete" on public.library_documents;
create policy "lib_docs_owner_delete" on public.library_documents for delete
using (public.get_org_role(organization_id, auth.uid()) in ('owner','admin') or auth.uid() = uploaded_by);

drop policy if exists "lib_chunks_member_read" on public.library_chunks;
create policy "lib_chunks_member_read" on public.library_chunks for select
using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "grants_anyone_read" on public.grants_catalog;
create policy "grants_anyone_read" on public.grants_catalog for select to authenticated
using (is_active);

drop policy if exists "grants_admin_write" on public.grants_catalog;
create policy "grants_admin_write" on public.grants_catalog for all
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "gf_searches_owner_read" on public.grantfinder_searches;
create policy "gf_searches_owner_read" on public.grantfinder_searches for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "gf_searches_owner_insert" on public.grantfinder_searches;
create policy "gf_searches_owner_insert" on public.grantfinder_searches for insert
with check (auth.uid() = user_id and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "ads_briefs_member_read" on public.ads_briefs;
create policy "ads_briefs_member_read" on public.ads_briefs for select
using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "ads_briefs_member_insert" on public.ads_briefs;
create policy "ads_briefs_member_insert" on public.ads_briefs for insert
with check (auth.uid() = created_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "ads_briefs_member_update" on public.ads_briefs;
create policy "ads_briefs_member_update" on public.ads_briefs for update
using (public.is_org_member(organization_id, auth.uid()))
with check (public.is_org_member(organization_id, auth.uid()));

drop policy if exists "ads_briefs_owner_delete" on public.ads_briefs;
create policy "ads_briefs_owner_delete" on public.ads_briefs for delete
using (public.get_org_role(organization_id, auth.uid()) in ('owner','admin') or auth.uid() = created_by);

drop policy if exists "ads_gens_member_read" on public.ads_generations;
create policy "ads_gens_member_read" on public.ads_generations for select
using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "ads_gens_member_insert" on public.ads_generations;
create policy "ads_gens_member_insert" on public.ads_generations for insert
with check (auth.uid() = generated_by and public.is_org_member(organization_id, auth.uid()));

drop policy if exists "ads_gens_member_update" on public.ads_generations;
create policy "ads_gens_member_update" on public.ads_generations for update
using (public.is_org_member(organization_id, auth.uid()))
with check (public.is_org_member(organization_id, auth.uid()));

-- =====================================================================
-- DONE
-- =====================================================================
-- Verify:
--   select tablename from pg_tables where schemaname='public'
--     and tablename in ('library_documents','library_chunks','grants_catalog',
--                       'grantfinder_searches','ads_briefs','ads_generations');
-- Expected: 6 rows.
--
-- Next steps:
--   1. Set Foundry secrets in Supabase (see docs/AZURE_FOUNDRY_SETUP.md).
--   2. Deploy edge functions: supabase functions deploy --project-ref YOUR_REF
--   3. Try Grant Writer Wizard - "Buat Proposal" - it now uses Foundry.
