-- Migration: Add E-ROI Carbon tracking columns to lfa_wbs_items
-- Path: supabase/migrations/20260618010000_eroi_carbon.sql

ALTER TABLE public.lfa_wbs_items
ADD COLUMN IF NOT EXISTS carbon_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS carbon_factor NUMERIC,
ADD COLUMN IF NOT EXISTS carbon_unit TEXT,
ADD COLUMN IF NOT EXISTS carbon_source TEXT,
ADD COLUMN IF NOT EXISTS carbon_description TEXT;

COMMENT ON COLUMN public.lfa_wbs_items.carbon_enabled 
IS 'Toggle: user must explicitly enable carbon tracking per item';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_factor 
IS 'Emission factor in kg CO2 per unit (negative = reduction)';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_unit 
IS 'Unit enum: kg_co2_per_unit | kg_co2_per_km | kg_co2_per_kwh | kg_co2_per_event';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_source 
IS 'Source reference: IPCC, GHG Protocol, PLN Indonesia';

COMMENT ON COLUMN public.lfa_wbs_items.carbon_description 
IS 'Human readable explanation of carbon impact';
