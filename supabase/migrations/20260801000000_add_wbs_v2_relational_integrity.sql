-- Migration: 20260801000000_add_wbs_v2_relational_integrity.sql
-- Description: Add foreign keys for explicit relational integrity between lfa_entries, lfa_wbs_items, and lfa_meal_items per ADR-0006.

-- 1. Add lfa_entry_id foreign key to lfa_wbs_items (Links Level 1 WBS items cleanly to Logframe Output entries)
ALTER TABLE public.lfa_wbs_items 
  ADD COLUMN IF NOT EXISTS lfa_entry_id UUID REFERENCES public.lfa_entries(id) ON DELETE SET NULL;

-- 2. Add wbs_item_id foreign key to lfa_meal_items (Links MEAL Output indicators cleanly to WBS items)
ALTER TABLE public.lfa_meal_items 
  ADD COLUMN IF NOT EXISTS wbs_item_id UUID REFERENCES public.lfa_wbs_items(id) ON DELETE SET NULL;

-- 3. Create performance indexes for relational joins
CREATE INDEX IF NOT EXISTS idx_lfa_wbs_items_lfa_entry_id ON public.lfa_wbs_items(lfa_entry_id);
CREATE INDEX IF NOT EXISTS idx_lfa_meal_items_wbs_item_id ON public.lfa_meal_items(wbs_item_id);

-- 4. Backfill existing legacy data where names or project/level relationships match exactly
UPDATE public.lfa_meal_items m
SET wbs_item_id = w.id
FROM public.lfa_wbs_items w
WHERE m.wbs_item_id IS NULL
  AND m.lfa_project_id = w.lfa_project_id
  AND m.lfa_level = 'output'
  AND w.level = 1
  AND LOWER(TRIM(w.name)) = LOWER(TRIM(m.indicator_text));
