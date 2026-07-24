-- Migration: Transactional LFA Matrix Materialization RPC
-- Path: supabase/migrations/20260724110000_materialize_lfa_matrix_transactional.sql

CREATE OR REPLACE FUNCTION public.materialize_lfa_matrix_transactional(
  p_project_id uuid,
  p_entries jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_entry jsonb;
  v_entry_id uuid;
  v_parent_id uuid;
  v_org_id uuid;
  v_raw_id text;
  v_raw_parent text;
  v_raw_org text;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'p_project_id cannot be null';
  END IF;

  -- 1. Atomic DELETE of existing entries for this project
  DELETE FROM public.lfa_entries WHERE project_id = p_project_id;

  -- 2. Atomic INSERT of new entries in single transaction
  IF p_entries IS NOT NULL AND jsonb_array_length(p_entries) > 0 THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
      v_raw_id := v_entry->>'id';
      v_raw_parent := v_entry->>'parent_id';
      v_raw_org := v_entry->>'org_id';

      -- Parse UUID for id
      IF v_raw_id IS NOT NULL AND v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_entry_id := v_raw_id::uuid;
      ELSE
        v_entry_id := gen_random_uuid();
      END IF;

      -- Parse UUID for parent_id
      IF v_raw_parent IS NOT NULL AND v_raw_parent ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_parent_id := v_raw_parent::uuid;
      ELSE
        v_parent_id := NULL;
      END IF;

      -- Parse UUID for org_id
      IF v_raw_org IS NOT NULL AND v_raw_org ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_org_id := v_raw_org::uuid;
      ELSE
        v_org_id := '00000000-0000-0000-0000-000000000000'::uuid;
      END IF;

      INSERT INTO public.lfa_entries (
        id,
        project_id,
        org_id,
        level,
        sequence,
        parent_id,
        description,
        indicator,
        means_of_verification,
        assumption,
        responsible_party,
        timeline_start,
        timeline_end,
        ai_suggestion
      ) VALUES (
        v_entry_id,
        p_project_id,
        v_org_id,
        COALESCE(v_entry->>'level', 'goal'),
        COALESCE((v_entry->>'sequence')::integer, 1),
        v_parent_id,
        v_entry->>'description',
        v_entry->>'indicator',
        v_entry->>'means_of_verification',
        v_entry->>'assumption',
        v_entry->>'responsible_party',
        (v_entry->>'timeline_start')::integer,
        (v_entry->>'timeline_end')::integer,
        v_entry->>'ai_suggestion'
      );

      v_inserted_count := v_inserted_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'inserted_count', v_inserted_count
  );
EXCEPTION WHEN OTHERS THEN
  -- Exception automatically triggers PL/pgSQL rollback of the DELETE and all INSERTs
  RAISE EXCEPTION 'Failed to materialize LFA matrix transactionally: %', SQLERRM;
END;
$$;
