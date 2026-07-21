-- Migration: Add deterministic source task identity to lfa_wbs_items
-- Path: supabase/migrations/20260619010000_add_wbs_source_task_identity.sql

ALTER TABLE public.lfa_wbs_items
  ADD COLUMN IF NOT EXISTS source_task_id TEXT;

COMMENT ON COLUMN public.lfa_wbs_items.source_task_id IS
  'Original deterministic task identifier from GrantWriter program_skeleton.wbs.tasks. Null for manually created rows and historical rows created before this field existed. Used to reconstruct the source-task-to-WBS-row map during materialization retry without title, sequence, or fuzzy matching.';

CREATE UNIQUE INDEX IF NOT EXISTS lfa_wbs_items_lfa_project_id_source_task_id_key
  ON public.lfa_wbs_items (lfa_project_id, source_task_id)
  WHERE source_task_id IS NOT NULL;
