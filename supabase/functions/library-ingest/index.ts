// supabase/functions/library-ingest/index.ts
// Ingests a plain-text document into the Impactory Library:
//   1. Inserts a row into library_documents
//   2. Splits the text into ~800-char chunks (with ~120 char overlap)
//   3. Embeds each chunk via Foundry
//   4. Inserts rows into library_chunks
//
// =========================================================================
// TODO (USER):
//   - Set Foundry secrets (see foundry.ts).
//   - This function expects PLAIN TEXT. For PDF/DOCX, parse on the client first
//     (recommended: pdf.js or mammoth in the browser) OR add a parser here later.
//   - Deploy: supabase functions deploy library-ingest
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryEmbed, embed } from '../_shared/foundry.ts';

interface IngestInput {
  title: string;
  source_url?: string;
  text: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  // OneDrive integration fields
  storage_provider?: string;
  storage_path?: string;
  storage_item_id?: string;
  drive_id?: string;
  web_url?: string;
  original_file_name?: string;
  size_bytes?: number;
  mime_type?: string;
}

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= CHUNK_SIZE) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    let slice = clean.slice(i, end);
    // Try to break on a natural boundary near the end
    if (end < clean.length) {
      const lastDot = slice.lastIndexOf('. ');
      const lastNl = slice.lastIndexOf('\n');
      const cut = Math.max(lastDot, lastNl);
      if (cut > CHUNK_SIZE * 0.5) {
        slice = slice.slice(0, cut + 1);
      }
    }
    chunks.push(slice.trim());
    
    if (end === clean.length) {
      break;
    }

    const nextI = i + slice.length - CHUNK_OVERLAP;
    if (nextI <= i) {
      i = end;
    } else {
      i = nextI;
    }
  }
  return chunks.filter((c) => c.length > 0);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let docId: string | null = null;
  try {
    const { user, organization_id } = await getUserAndOrg(req);
    const body = (await req.json()) as IngestInput;
    if (!body.title || !body.text || body.text.length < 50) {
      return json({ error: 'title and text (>=50 chars) are required' }, 400);
    }

    const admin = adminClient();
    const mergedMetadata = {
      ...(body.metadata ?? {}),
      tags: body.tags ?? (body.metadata?.tags ?? []),
    };

    const { data: doc, error: docErr } = await admin
      .from('library_documents')
      .insert({
        organization_id,
        uploaded_by: user.id,
        title: body.title,
        source_url: body.source_url ?? null,
        metadata: mergedMetadata,
        status: 'processing',
        storage_provider: body.storage_provider ?? null,
        storage_path: body.storage_path ?? null,
        storage_item_id: body.storage_item_id ?? null,
        drive_id: body.drive_id ?? null,
        web_url: body.web_url ?? null,
        size_bytes: body.size_bytes ?? null,
        mime_type: body.mime_type ?? null,
        original_file_name: body.original_file_name ?? null,
      })
      .select('id')
      .single();
    if (docErr || !doc) return json({ error: docErr?.message ?? 'insert failed' }, 500);
    docId = doc.id;

    const chunks = chunkText(body.text);
    let inserted = 0;
    const errors: string[] = [];

    try {
      // Batch embed all chunks in a single API call to Azure OpenAI / Foundry
      const embedRes = await embed(chunks);
      const embeddings = embedRes.data;

      // Map chunks to database inserts
      const insertPayloads = chunks.map((c, idx) => {
        const embObj = embeddings.find((e) => e.index === idx) || embeddings[idx];
        return {
          document_id: doc.id,
          organization_id,
          chunk_index: idx,
          content: c,
          embedding: embObj?.embedding,
          token_count: Math.ceil(c.length / 4),
        };
      });

      // Batch insert all chunks to the database in a single query
      const { error: chunkErr } = await admin.from('library_chunks').insert(insertPayloads);
      if (chunkErr) {
        errors.push('Failed to insert chunks: ' + chunkErr.message);
      } else {
        inserted = chunks.length;
      }
    } catch (e) {
      errors.push('Batch embedding or insertion failed: ' + (e as Error).message);
    }

    const finalMetadata = {
      ...mergedMetadata,
      chunk_count: inserted,
    };

    await admin
      .from('library_documents')
      .update({
        status: inserted > 0 ? 'indexed' : 'failed',
        metadata: finalMetadata,
        status_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', doc.id);

    if (inserted > 0) {
      await admin.from('ai_generations').insert({
        organization_id,
        user_id: user.id,
        product: 'impactory_library',
        metadata: { document_id: doc.id, chunks: inserted },
      });
    }

    return json({ document_id: doc.id, chunks_inserted: inserted, errors });
  } catch (err) {
    if (docId) {
      try {
        const admin = adminClient();
        await admin
          .from('library_documents')
          .update({
            status: 'failed',
            status_message: 'Internal processing error: ' + (err as Error).message,
          })
          .eq('id', docId);
      } catch (updateErr) {
        console.error('Failed to update document status in outer catch:', updateErr);
      }
    }
    return json({ error: 'Terjadi kesalahan internal saat memproses pengindeksan dokumen.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
