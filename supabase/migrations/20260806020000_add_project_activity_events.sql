-- Migration: 20260806020000_add_project_activity_events.sql
-- Description: Append-only Project Management Activity Log. Database-enforced
-- event_type/entity_type vocabularies and a payload-size bound keep the table from
-- becoming a dumping ground; write access is granted only through domain RPCs
-- (INSERT/UPDATE/DELETE are revoked from authenticated/anon at the grant layer, so
-- RLS is never even reached for a client write attempt).

CREATE TABLE IF NOT EXISTS public.project_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN (
    'project',
    'objective',
    'stage',
    'wbs_item',
    'meal_item',
    'deliverable'
  )),
  entity_id UUID NOT NULL,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'project_created',
    'objective_created',
    'objective_updated',
    'objective_reordered',
    'objective_archived',
    'objective_restored',
    'stage_created',
    'stage_updated',
    'stage_reordered',
    'stage_status_changed',
    'stage_archived',
    'stage_restored',
    'wbs_stage_assigned',
    'wbs_stage_unassigned',
    'meal_context_changed',
    'deliverable_created',
    'deliverable_status_changed',
    'deliverable_archived',
    'deliverable_stage_assigned',
    'deliverable_stage_unassigned'
  )),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (pg_column_size(safe_metadata) <= 8192),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_events_org_id
  ON public.project_activity_events(org_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_events_project_id
  ON public.project_activity_events(project_id);

ALTER TABLE public.project_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_activity_events_member_select ON public.project_activity_events;
CREATE POLICY project_activity_events_member_select ON public.project_activity_events
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

GRANT SELECT ON TABLE public.project_activity_events TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_activity_events FROM authenticated, anon;
