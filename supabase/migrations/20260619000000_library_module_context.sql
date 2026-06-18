-- Migration: Add library module context for module-scoped RAG
-- Path: supabase/migrations/20260619000000_library_module_context.sql

ALTER TABLE public.library_documents
ADD COLUMN IF NOT EXISTS source_module text,
ADD COLUMN IF NOT EXISTS source_record_id uuid;

CREATE INDEX IF NOT EXISTS idx_library_documents_module
ON public.library_documents(source_module, source_record_id)
WHERE source_module IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_library_chunks(
  _org_id uuid,
  _query_embedding vector(1536),
  _match_count int,
  _min_similarity float,
  _source_module text DEFAULT NULL,
  _source_record_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lc.id AS id,
    lc.id AS chunk_id,
    lc.document_id AS document_id,
    ld.title AS document_title,
    lc.content AS content,
    1 - (lc.embedding <=> _query_embedding) AS similarity
  FROM public.library_chunks lc
  JOIN public.library_documents ld ON ld.id = lc.document_id
  WHERE ld.organization_id = _org_id
    AND lc.embedding IS NOT NULL
    AND (
      _source_module IS NULL
      OR ld.source_module = _source_module
    )
    AND (
      _source_record_id IS NULL
      OR ld.source_record_id = _source_record_id
    )
    AND (1 - (lc.embedding <=> _query_embedding)) >= _min_similarity
  ORDER BY similarity DESC
  LIMIT _match_count;
$$;
