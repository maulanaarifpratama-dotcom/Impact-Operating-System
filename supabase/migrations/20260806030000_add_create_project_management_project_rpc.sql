-- Migration: 20260806030000_add_create_project_management_project_rpc.sql
-- Description: Atomic, RPC-only creation path for Project Management projects.
-- Inserts lfa_projects (project_mode hardcoded server-side, never a client
-- parameter) and its project_created activity event inside a single plpgsql
-- function call, so a project can never exist without its creation event -- if
-- the event insert fails for any reason, the whole call aborts and the project
-- row is rolled back with it.

CREATE OR REPLACE FUNCTION public.create_project_management_project(
  p_name TEXT,
  p_sector TEXT,
  p_location TEXT,
  p_duration_months INTEGER,
  p_start_date DATE,
  p_beneficiary_count INTEGER,
  p_beneficiary_description TEXT
)
RETURNS TABLE (
  project_id UUID,
  name TEXT,
  org_id UUID,
  project_mode VARCHAR(20),
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org_id UUID;
  v_project public.lfa_projects;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'PROJECT_MANAGEMENT_AUTH_REQUIRED: authentication is required to create a project';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.organization_members
  WHERE user_id = v_actor
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_MANAGEMENT_MEMBERSHIP_REQUIRED: caller has no organization membership';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id) THEN
    RAISE EXCEPTION 'PROJECT_MANAGEMENT_ORG_NOT_FOUND: resolved organization does not exist';
  END IF;

  IF NOT public.has_paid_plan(v_org_id) THEN
    RAISE EXCEPTION 'PROJECT_MANAGEMENT_PAID_PLAN_REQUIRED: a paid plan is required to create a project';
  END IF;

  INSERT INTO public.lfa_projects (
    org_id, name, sector, location, duration_months, start_date,
    beneficiary_count, beneficiary_description, status, project_mode
  ) VALUES (
    v_org_id, p_name, p_sector, p_location, p_duration_months, p_start_date,
    p_beneficiary_count, p_beneficiary_description, 'draft', 'project_management'
  )
  RETURNING * INTO v_project;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_MANAGEMENT_CREATE_FAILED: project insert did not return a row';
  END IF;

  INSERT INTO public.project_activity_events (
    org_id, project_id, actor_id, entity_type, entity_id, event_type, safe_metadata
  ) VALUES (
    v_project.org_id, v_project.id, v_actor, 'project', v_project.id, 'project_created',
    jsonb_build_object('name', v_project.name)
  );

  RETURN QUERY
  SELECT v_project.id, v_project.name, v_project.org_id, v_project.project_mode,
         v_project.status, v_project.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_management_project(
  TEXT, TEXT, TEXT, INTEGER, DATE, INTEGER, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_project_management_project(
  TEXT, TEXT, TEXT, INTEGER, DATE, INTEGER, TEXT
) TO authenticated, service_role;
