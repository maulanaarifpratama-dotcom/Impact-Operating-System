-- Migration: 20260727013000_bootstrap_library_documents_uploaded_by.sql
-- Description: R3 — bootstrap public.library_documents.uploaded_by so a
-- fresh replay can reach 20260727020000_plan_entitlements.sql, whose
-- lib_docs_member_insert policy references this column in its WITH CHECK
-- clause but no committed migration ever adds it.
--
-- library_documents is created by 20260600000000_organizations.sql with only
-- (id, organization_id, title, source_module, source_record_id, created_at).
-- Production's real table has 23 columns -- confirmed via a read-only
-- production catalog inventory (R3 Final Gate, 2026-08-05) -- but
-- uploaded_by is the only one any committed migration or RLS policy ever
-- references. The other columns are a separate schema-drift finding,
-- explicitly out of scope here, matching the same convention already
-- established for gw_projects.created_by in 20260727012000.
--
-- Canonical shape, confirmed live in production: UUID NOT NULL, no default,
-- FOREIGN KEY -> auth.users(id) ON DELETE RESTRICT. No trigger populates it
-- anywhere; production's own lib_docs_member_insert policy is what enforces
-- auth.uid() = uploaded_by, so this migration adds no default and creates no
-- policy of its own -- 20260727020000 remains solely responsible for
-- lib_docs_member_insert, unchanged. Replacement read/update/delete policies
-- for library_documents belong to 20260727015000, not here.

DO $$
DECLARE
  v_col_exists BOOLEAN;
  v_udt_name TEXT;
  v_is_nullable TEXT;
  v_row_count BIGINT;
  v_null_count BIGINT;
  v_conname TEXT;
  v_confrelid regclass;
  v_confdeltype CHAR;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'library_documents' AND column_name = 'uploaded_by'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    SELECT count(*) INTO v_row_count FROM public.library_documents;

    IF v_row_count > 0 THEN
      RAISE EXCEPTION 'LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED: library_documents has % existing row(s) and no uploaded_by column to backfill from', v_row_count;
    END IF;

    ALTER TABLE public.library_documents
      ADD COLUMN uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT;

    RETURN;
  END IF;

  -- Column exists: validate its shape before deciding whether it is already canonical.
  SELECT udt_name, is_nullable INTO v_udt_name, v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'library_documents' AND column_name = 'uploaded_by';

  IF v_udt_name <> 'uuid' THEN
    RAISE EXCEPTION 'UNEXPECTED_LIBRARY_UPLOADED_BY_TYPE: library_documents.uploaded_by has udt_name % (expected uuid)', v_udt_name;
  END IF;

  SELECT c.conname, c.confrelid, c.confdeltype
  INTO v_conname, v_confrelid, v_confdeltype
  FROM pg_constraint c
  WHERE c.conrelid = 'public.library_documents'::regclass
    AND c.contype = 'f'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.library_documents'::regclass AND attname = 'uploaded_by')];

  IF v_conname IS NOT NULL AND (v_confrelid <> 'auth.users'::regclass OR v_confdeltype <> 'r') THEN
    RAISE EXCEPTION 'UNEXPECTED_LIBRARY_UPLOADED_BY_FK: existing constraint % on library_documents.uploaded_by targets % with delete action % (expected auth.users(id) ON DELETE RESTRICT)', v_conname, v_confrelid, v_confdeltype;
  END IF;

  IF v_is_nullable = 'NO' THEN
    -- Present, canonical NOT NULL uuid. Only add the FK if one is entirely
    -- absent -- an existing, differently-shaped FK was already rejected above.
    IF v_conname IS NULL THEN
      ALTER TABLE public.library_documents
        ADD CONSTRAINT library_documents_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
    END IF;
    RETURN;
  END IF;

  -- Nullable: only safe to tighten if no existing row would violate NOT NULL.
  -- Never infer ownership from organization creator, storage metadata, the
  -- latest uploader, or any other document row -- abort instead of guessing.
  SELECT count(*) INTO v_null_count FROM public.library_documents WHERE uploaded_by IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'LIBRARY_UPLOADED_BY_BACKFILL_BLOCKED: library_documents has % row(s) with a NULL uploaded_by and cannot be backfilled automatically', v_null_count;
  END IF;

  IF v_conname IS NULL THEN
    ALTER TABLE public.library_documents
      ADD CONSTRAINT library_documents_uploaded_by_fkey
      FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  ALTER TABLE public.library_documents ALTER COLUMN uploaded_by SET NOT NULL;
END $$;
