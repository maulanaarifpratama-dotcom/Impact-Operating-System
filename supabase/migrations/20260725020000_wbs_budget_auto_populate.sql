-- Migration: 20260725020000_wbs_budget_auto_populate.sql
-- Description: Ensures default empty budget line items are auto-populated for any Level 2 WBS items that do not yet have budget items.

-- 1. Function to auto-populate default budget rows for level 2 WBS items lacking budget items
CREATE OR REPLACE FUNCTION public.auto_populate_wbs_default_budget_items(
  p_lfa_project_id UUID,
  p_org_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  INSERT INTO public.lfa_budget_items (
    lfa_project_id,
    org_id,
    wbs_item_id,
    activity_name,
    category,
    cost_category,
    item_name,
    volume,
    unit,
    unit_price_idr,
    justification,
    needs_donor_approval,
    sort_order,
    mode
  )
  SELECT
    p_lfa_project_id,
    p_org_id,
    wi.id,
    COALESCE(wi.name, 'Aktivitas WBS'),
    'Operasional',
    'Direct Operational Costs',
    'Rincian anggaran belum diisi',
    0,
    'Paket',
    0,
    'Belum diisi',
    FALSE,
    0,
    'simple'
  FROM public.lfa_wbs_items wi
  WHERE wi.lfa_project_id = p_lfa_project_id
    AND wi.level = 2
    AND NOT EXISTS (
      SELECT 1 FROM public.lfa_budget_items bi WHERE bi.wbs_item_id = wi.id
    );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;
