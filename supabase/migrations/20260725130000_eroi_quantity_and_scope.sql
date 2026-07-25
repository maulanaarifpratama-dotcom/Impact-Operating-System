-- Migration: Add carbon_quantity and carbon_scope columns to lfa_wbs_items
-- Path: supabase/migrations/20260725130000_eroi_quantity_and_scope.sql

ALTER TABLE public.lfa_wbs_items
ADD COLUMN IF NOT EXISTS carbon_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS carbon_scope TEXT CHECK (carbon_scope IS NULL OR carbon_scope IN ('scope_1', 'scope_2', 'scope_3'));

COMMENT ON COLUMN public.lfa_wbs_items.carbon_quantity 
IS 'Actual quantity/volume for carbon impact calculation (e.g., number of trees, km traveled, kWh used)';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_scope 
IS 'GHG Protocol scope classification: scope_1 (direct), scope_2 (purchased energy), scope_3 (value chain)';
