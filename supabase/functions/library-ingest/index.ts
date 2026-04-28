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
import { foundryEmbed } from '../_shared/foundry.ts';

interface IngestInput {
  title: string;
  source_url?: string;
  text: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
    i += slice.length - CHUNK_OVERLAP;
    if (i < 0) i = slice.length;
  }
  return chunks.filter((c) => c.length > 0);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id } = await getUserAndOrg(req);
    const body = (await req.json()) as IngestInput;
    if (!body.title || !body.text || body.text.length < 50) {
      return json({ error: 'title and text (>=50 chars) are required' }, 400);
    }

    const admin = adminClient();
    const { data: doc, error: docErr } = await admin
      .from('library_documents')
      .insert({
        organization_id,
        user_id: user.id,
        title: body.title,
        source_url: body.source_url ?? null,
        tags: body.tags ?? [],
        metadata: body.metadata ?? {},
        char_count: body.text.length,
        status: 'processing',
      })
      .select('id')
      .single();
    if (docErr || !doc) return json({ error: docErr?.message ?? 'insert failed' }, 500);

    const chunks = chunkText(body.text);
    let inserted = 0;
    const errors: string[] = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const c = chunks[idx];
      try {
        const emb = await foundryEmbed(c);
        const { error: ce } = await admin.from('library_chunks').insert({
          document_id: doc.id,
          organization_id,
          chunk_index: idx,
          content: c,
          embedding: emb,
          token_estimate: Math.ceil(c.length / 4),
        });
        if (ce) errors.push('chunk ' + idx + ': ' + ce.message);
        else inserted++;
      } catch (e) {
        errors.push('chunk ' + idx + ': ' + (e as Error).message);
      }
    }

    await admin
      .from('library_documents')
      .update({ status: errors.length > 0 ? 'partial' : 'ready', chunk_count: inserted })
      .eq('id', doc.id);

    await admin.from('ai_generations').insert({
      organization_id,
      user_id: user.id,
      feature: 'library_ingest',
      metadata: { document_id: doc.id, chunks: inserted },
    });

    return json({ document_id: doc.id, chunks_inserted: inserted, errors });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
