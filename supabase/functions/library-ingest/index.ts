// supabase/functions/library-ingest/index.ts
// Ingests a document (PDF or plain-text) into the Impactory Library:
//   1. Parses base64 encoded document (using native extraction for PDF)
//   2. Splits the text into safe chunks (~800 tokens / 3500 characters, ~400 char overlap)
//   3. Embeds chunks in batches of MAX 10 (Cost control)
//   4. Inserts row into library_documents with source_module & source_record_id
//   5. Inserts chunks bulk
//
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { embed } from '../_shared/foundry.ts';

interface IngestInput {
  // Legacy fields
  title?: string;
  text?: string;
  source_url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  size_bytes?: number;
  mime_type?: string;
  original_file_name?: string;

  // New fields
  org_id?: string;
  file_base64?: string;
  file_name?: string;
  file_type?: string;
  source_module?: string;
  source_record_id?: string;
}

const CHUNK_SIZE = 3500; // ~800 tokens
const CHUNK_OVERLAP = 400; // ~400 chars overlap

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

function extractTextFromPdf(bytes: Uint8Array): string {
  const content = new TextDecoder('latin1').decode(bytes);
  
  // Try extracting text blocks between BT and ET
  const btEtRegex = /BT[\s\S]*?ET/g;
  let match;
  let textFromBlocks = '';
  
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[0];
    const parenRegex = /\(((?:[^\\)]|\\.)*)\)/g;
    let textMatch;
    while ((textMatch = parenRegex.exec(block)) !== null) {
      textFromBlocks += textMatch[1]
        .replace(/\\([\(\)])/g, '$1')
        .replace(/\\r/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t') + ' ';
    }
    textFromBlocks += '\n';
  }
  
  let result = textFromBlocks
    .replace(/[^\x20-\x7E\s]/g, '') // strip non-printable chars
    .replace(/\s+/g, ' ')
    .trim();
    
  if (result.length > 50) {
    return result;
  }
  
  // Fallback: Search all parentheses in the whole document, but filter out binary-looking strings
  let textFromParens = '';
  const generalParenRegex = /\(((?:[^\\)]|\\.)*)\)/g;
  while ((match = generalParenRegex.exec(content)) !== null) {
    const candidate = match[1]
      .replace(/\\([\(\)])/g, '$1')
      .replace(/[^\x20-\x7E\s]/g, '') // remove non-printable
      .trim();
    
    // Ignore candidate if it has weird PDF keywords or is mostly non-alphabetic
    if (candidate.length > 3 && !/^[0-9a-fA-F\s]+$/.test(candidate) && !/^(identity|f\d+|font|procset|colorspace)/i.test(candidate)) {
      textFromParens += candidate + ' ';
    }
  }
  
  result = textFromParens.replace(/\s+/g, ' ').trim();
  if (result.length > 50) {
    return result;
  }
  
  // Last fallback: strip stream chunks and pdf commands
  const stripped = content
    .replace(/\/[\w\-\d]+/g, '') // remove pdf dictionary keys
    .replace(/<<[\s\S]*?>>/g, '') // remove pdf dictionaries
    .replace(/stream[\s\S]*?endstream/g, '') // remove binary stream data
    .replace(/[^\x20-\x7E\n\t]/g, '') // strip non-printable
    .replace(/\s+/g, ' ')
    .trim();
    
  if (stripped.length > 20) {
    return stripped;
  }
  
  return "Gagal mengekstrak teks terkompresi dari dokumen PDF.";
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let docId: string | null = null;
  try {
    const { user, organization_id: authOrgId } = await getUserAndOrg(req);
    const body = (await req.json()) as IngestInput;
    const organization_id = body.org_id || authOrgId;

    let title = body.file_name || body.title || 'Untitled Document';
    let text = '';
    const mimeType = body.file_type || body.mime_type || null;
    const fileTypeLower = (body.file_type || '').toLowerCase();
    const isPdf = fileTypeLower.includes('pdf') || (mimeType && mimeType.includes('pdf')) || (title && title.toLowerCase().endsWith('.pdf'));
    const isDocx = fileTypeLower.includes('docx') || (mimeType && mimeType.includes('docx')) || (title && title.toLowerCase().endsWith('.docx'));

    if (body.file_base64) {
      if (isDocx) {
        return json({ error: 'Format file DOCX tidak didukung saat ini (skip).' }, 400);
      }

      // Decode base64 using native atob
      const binaryString = atob(body.file_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (isPdf) {
        try {
          text = extractTextFromPdf(bytes);
        } catch (parseErr) {
          console.error('PDF parsing error:', parseErr);
          return json({ error: 'Gagal mengurai file PDF: ' + (parseErr as Error).message }, 400);
        }
      } else {
        try {
          text = new TextDecoder().decode(bytes);
        } catch (decodeErr) {
          console.error('Text decoding error:', decodeErr);
          return json({ error: 'Gagal membaca isi file sebagai teks.' }, 400);
        }
      }
    } else if (body.text) {
      if (isDocx) {
        return json({ error: 'Format file DOCX tidak didukung saat ini (skip).' }, 400);
      }
      text = body.text;
    }

    if (!text || text.trim().length < 10) {
      return json({ error: 'Isi file atau teks dokumen terlalu pendek atau tidak terbaca.' }, 400);
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
        title: title,
        source_url: body.source_url ?? null,
        metadata: mergedMetadata,
        status: 'processing',
        storage_provider: 'local',
        size_bytes: body.size_bytes ?? (body.file_base64 ? Math.ceil(body.file_base64.length * 0.75) : text.length),
        mime_type: mimeType,
        original_file_name: body.file_name ?? body.original_file_name ?? null,
        source_module: body.source_module ?? null,
        source_record_id: body.source_record_id ?? null,
      })
      .select('id')
      .single();

    if (docErr || !doc) return json({ error: docErr?.message ?? 'insert failed' }, 500);
    docId = doc.id;

    const chunks = chunkText(text);
    let inserted = 0;
    const errors: string[] = [];

    // COST CONTROL: Batch embedding MAX 10 chunks per call
    const embeddings: any[] = [];
    const batchSize = 10;

    try {
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embedRes = await embed(batch);
        const batchEmbeddings = embedRes.data.map((item: any, idx: number) => ({
          embedding: item.embedding,
          index: i + (item.index !== undefined ? item.index : idx),
        }));
        embeddings.push(...batchEmbeddings);
      }

      // Map chunks to database inserts
      const insertPayloads = chunks.map((c, idx) => {
        const embObj = embeddings.find((e) => e.index === idx);
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
      try {
        const { error: telemetryError } = await admin.from('ai_generations').insert({
          organization_id,
          user_id: user.id,
          product: 'impactory_library',
          metadata: { document_id: doc.id, chunks: inserted },
        });

        if (telemetryError) {
          console.warn('[library-ingest] AI usage telemetry insert failed');
        }
      } catch {
        console.warn('[library-ingest] AI usage telemetry insert failed');
      }
    }

    // MANDATORY LOGGING
    const estimatedTokens = Math.ceil(text.length / 4);
    console.log(JSON.stringify({
      feature: "library_ingest",
      chunkCount: inserted,
      estimatedTokens
    }));

    return json({ document_id: doc.id, chunk_count: inserted, errors });
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
    return json({ error: 'Terjadi kesalahan internal saat memproses pengindeksan dokumen: ' + (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

