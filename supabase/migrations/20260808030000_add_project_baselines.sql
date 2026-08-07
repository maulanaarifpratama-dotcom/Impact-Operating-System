-- Migration: 20260808030000_add_project_baselines.sql
-- Description: Baseline Lock Foundation — single-baseline per project.
--   Owner-only snapshot of current Stage order and Activity name/status/dates.
--   Read-only after creation. Replacing a baseline overwrites the previous one
--   (MVP: no multi-baseline, no comparison UI, no rollback).

CREATE TABLE IF NOT EXISTS public.project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.lfa_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_baselines_project_id
  ON public.project_baselines(project_id);

ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_baselines_member_select ON public.project_baselines;
CREATE POLICY project_baselines_member_select ON public.project_baselines
  FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_baselines FROM authenticated, anon;
GRANT SELECT ON TABLE public.project_baselines TO authenticated, service_role;

-- ==========================================================================
-- create_project_baseline RPC — Owner-only, single-baseline UPSERT
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.create_project_baseline(
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  version INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_project_mode VARCHAR(20);
  v_existing_id UUID;
  v_existing_version INTEGER;
  v_snapshot JSONB;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'BASELINE_AUTH_REQUIRED: authentication is required';
  END IF;

  SELECT lp.org_id, lp.project_mode INTO v_org_id, v_project_mode
  FROM public.lfa_projects lp
  WHERE lp.id = p_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'BASELINE_PROJECT_NOT_FOUND: project does not exist';
  END IF;

  IF public.get_org_role(v_org_id, v_actor) <> 'owner' THEN
    RAISE EXCEPTION 'BASELINE_FORBIDDEN: only organisation owner may lock a baseline';
  END IF;

  IF v_project_mode <> 'project_management' THEN
    RAISE EXCEPTION 'BASELINE_PM_ONLY: baseline requires a project_management project';
  END IF;

  SELECT id, version INTO v_existing_id, v_existing_version
  FROM public.project_baselines
  WHERE project_id = p_project_id
  FOR UPDATE;

  SELECT jsonb_build_object(
    'version', COALESCE(v_existing_version, 0) + 1,
    'baseline_date', now(),
    'project', (
      SELECT jsonb_build_object(
        'id', lp.id,
        'name', lp.name,
        'duration_months', lp.duration_months
      )
      FROM public.lfa_projects lp
      WHERE lp.id = p_project_id
    ),
    'stages', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'title', ps.title,
          'sort_order', ps.sort_order,
          'planned_start_date', ps.planned_start_date,
          'planned_end_date', ps.planned_end_date,
          'activities', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', wi.id,
                'name', wi.name,
                'status', wi.status,
                'planned_start_date', wi.planned_start_date,
                'planned_end_date', wi.planned_end_date,
                'sort_order', wi.sort_order
              )
              ORDER BY wi.sort_order
            ) FILTER (WHERE wi.id IS NOT NULL), '[]'::jsonb)
            FROM public.lfa_wbs_items l1
            JOIN public.lfa_wbs_items wi ON wi.parent_id = l1.id AND wi.level = 2
            WHERE l1.lfa_project_id = p_project_id
              AND l1.level = 1
              AND l1.stage_id = ps.id
          )
        )
        ORDER BY ps.sort_order
      ) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb)
      FROM public.project_stages ps
      WHERE ps.project_id = p_project_id
        AND ps.archived_at IS NULL
    )
  ) INTO v_snapshot;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.project_baselines
    SET version = v_existing_version + 1,
        snapshot = v_snapshot,
        created_by = v_actor,
        created_at = now()
    WHERE id = v_existing_id
    RETURNING id, project_id, version, created_by, created_at
    INTO v_existing_id, p_project_id, v_existing_version, v_actor;
    v_existing_version := v_existing_version;
  ELSE
    INSERT INTO public.project_baselines (org_id, project_id, version, snapshot, created_by)
    VALUES (v_org_id, p_project_id, 1, v_snapshot, v_actor)
    RETURNING id, project_id, version, created_by, created_at
    INTO v_existing_id, p_project_id, v_existing_version, v_actor;
  END IF;

  RETURN QUERY SELECT v_existing_id, p_project_id, v_existing_version, v_actor, now();
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_baseline(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_baseline(UUID) TO authenticated, service_role;
