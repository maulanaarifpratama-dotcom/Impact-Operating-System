-- Migration: 20260806010000_add_project_mode.sql
-- Description: Add project_mode discriminator to lfa_projects (programme_design vs
-- project_management) with a non-privileged immutability trigger enforced regardless
-- of caller role or write path.

ALTER TABLE public.lfa_projects
  ADD COLUMN IF NOT EXISTS project_mode VARCHAR(20) NOT NULL DEFAULT 'programme_design'
  CHECK (project_mode IN ('programme_design', 'project_management'));

CREATE OR REPLACE FUNCTION public.enforce_project_mode_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.project_mode IS DISTINCT FROM NEW.project_mode THEN
    RAISE EXCEPTION 'PROJECT_MODE_IMMUTABLE: project_mode cannot be changed after project creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lfa_projects_mode_immutable ON public.lfa_projects;

CREATE TRIGGER trg_lfa_projects_mode_immutable
  BEFORE UPDATE OF project_mode ON public.lfa_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_mode_immutable();
