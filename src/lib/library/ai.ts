// src/lib/library/ai.ts
// Client helpers for Library RAG: ingest a document and ask questions about it.
//
// IMPORTANT: ingestLibraryText() expects PLAIN TEXT.
//   For PDF: parse client-side first using pdfjs-dist, then call ingestLibraryText.
//   For DOCX: use mammoth.js client-side.
//
// Both functions degrade gracefully when the edge function is not deployed:
//   they return { used: false } and the UI should fall back to local mode.

import { supabase } from '@/integrations/supabase/client';

function getEdgeUrl(name: string): string | null {
  const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  if (!SUPABASE_URL) return null;
  return SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/' + name;
}

async function authHeader(orgId?: string): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) return null;
  const headers: Record<string, string> = { 
    Authorization: 'Bearer ' + t, 
    'Content-Type': 'application/json' 
  };
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }
  return headers;
}

export interface IngestInput {
  title: string;
  text: string;
  source_url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  storage_provider?: string;
  storage_path?: string;
  storage_item_id?: string;
  drive_id?: string;
  web_url?: string;
  original_file_name?: string;
  size_bytes?: number;
  mime_type?: string;
  organization_id?: string;
}

export interface IngestResult {
  used: boolean;
  document_id?: string;
  chunks_inserted?: number;
  errors?: string[];
  error?: string;
}

export async function ingestLibraryText(input: IngestInput): Promise<IngestResult> {
  const url = getEdgeUrl('library-ingest');
  const headers = await authHeader(input.organization_id);
  if (!url || !headers) return { used: false, error: 'Not authenticated or VITE_SUPABASE_URL missing' };
  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(input) });
    if (!resp.ok) return { used: false, error: 'http ' + resp.status };
    const json = await resp.json();
    return { used: true, ...json };
  } catch (e) {
    return { used: false, error: (e as Error).message };
  }
}

export interface RagInput {
  question: string;
  document_ids?: string[];
  match_count?: number;
  organization_id?: string;
}

export interface RagCitation {
  n: number;
  document_id: string;
  document_title: string;
  chunk_index: number;
  similarity: number;
  excerpt: string;
}

export interface RagResult {
  used: boolean;
  answer: string;
  citations: RagCitation[];
  error?: string;
}

export async function askLibrary(input: RagInput): Promise<RagResult> {
  const url = getEdgeUrl('library-rag');
  const headers = await authHeader(input.organization_id);
  if (!url || !headers) {
    return { used: false, answer: '', citations: [], error: 'Not authenticated' };
  }
  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(input) });
    if (!resp.ok) {
      return { used: false, answer: '', citations: [], error: 'http ' + resp.status };
    }
    const json = await resp.json();
    return {
      used: !!json.used_ai,
      answer: json.answer ?? '',
      citations: (json.citations as RagCitation[]) ?? [],
      error: json.error,
    };
  } catch (e) {
    return { used: false, answer: '', citations: [], error: (e as Error).message };
  }
}
