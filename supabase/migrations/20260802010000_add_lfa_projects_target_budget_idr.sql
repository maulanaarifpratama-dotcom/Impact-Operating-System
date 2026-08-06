-- Incident patch: manual LFA target budget support requires lfa_projects.target_budget_idr
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.lfa_projects
  ADD COLUMN IF NOT EXISTS target_budget_idr bigint;

COMMENT ON COLUMN public.lfa_projects.target_budget_idr
  IS 'Canonical target budget in IDR for LFA project-level mirror budget model.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lfa_projects_target_budget_idr_positive'
      AND conrelid = 'public.lfa_projects'::regclass
  ) THEN
    ALTER TABLE public.lfa_projects
      ADD CONSTRAINT lfa_projects_target_budget_idr_positive
      CHECK (target_budget_idr IS NULL OR target_budget_idr > 0);
  END IF;
END;
$$;

-- Optional backfill from linked grant projects when gw_projects has budget_idr.
DO $$
BEGIN
  IF to_regclass('public.gw_projects') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gw_projects'
         AND column_name = 'budget_idr'
     )
  THEN
    UPDATE public.lfa_projects lp
    SET target_budget_idr = gp.budget_idr
    FROM public.gw_projects gp
    WHERE lp.target_budget_idr IS NULL
      AND lp.linked_grant_id IS NOT NULL
      AND gp.id = lp.linked_grant_id
      AND gp.budget_idr IS NOT NULL
      AND gp.budget_idr > 0;
  END IF;
END;
$$;

-- Ask PostgREST to refresh cached schema immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;
