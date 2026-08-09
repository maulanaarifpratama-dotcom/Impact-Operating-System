-- Migration: 20260808120000_drop_deliverable_derivation_zombie.sql
-- Description: PM + MEAL V1 debt closure (Task 3). The canonical rule is
-- "Deliverables = derived from Verified ACR" (see DeliverablesTab in
-- ProjectMEALPage.tsx, and pmPdfExport.ts) — a Deliverable IS an Activity
-- whose ACR reached Closed, nothing else, computed live, never stored.
--
-- project_deliverables / project_deliverable_activities (created by
-- 20260808000000_add_project_deliverables_and_milestones.sql — since
-- corrected/removed) and the auto-derivation trigger pair added in
-- 20260808020000_deliverable_activity_derivation.sql belong to an earlier,
-- abandoned "hybrid manual+derived" Deliverable model. No UI creates or
-- links rows in these tables anymore (the linking surface was removed along
-- with the standalone Deliverables/Milestones pages), so
-- trg_wbs_activity_deliverable_sync has been firing on every single
-- lfa_wbs_items status/progress update for no live consumer. Tear the whole
-- thing down. Idempotent — safe whether or not these objects exist.

DROP TRIGGER IF EXISTS trg_wbs_activity_deliverable_sync ON public.lfa_wbs_items;
DROP TRIGGER IF EXISTS trg_deliverable_activity_link ON public.project_deliverable_activities;

DROP FUNCTION IF EXISTS public.trg_wbs_activity_deliverable_sync();
DROP FUNCTION IF EXISTS public.trg_deliverable_activity_link();
DROP FUNCTION IF EXISTS public.derive_deliverable_status_from_activities(UUID);

DROP TABLE IF EXISTS public.project_deliverable_activities;
DROP TABLE IF EXISTS public.project_deliverables;
DROP TABLE IF EXISTS public.project_milestones;
