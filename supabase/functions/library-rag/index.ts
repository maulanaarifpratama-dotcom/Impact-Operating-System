// supabase/functions/library-rag/index.ts
// Retrieval-Augmented Generation over the user's Impactory Library.
//   1. Embeds the question
//   2. Calls match_library_chunks() RPC with org filter
//   3. Sends top chunks + question to chat model
//   4. Returns answer + citations
//
// =========================================================================
// TODO (USER): set Foundry secrets, then deploy:
//   supabase functions deploy library-rag
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryEmbed, foundryChat } from '../_shared/foundry.ts';

interface RagInput {
  question: string;
  document_ids?: string[]; // optional: restrict to specific docs
  match_count?: number;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id, supabase } = await getUserAndOrg(req);
    const body = (await req.json()) as RagInput;
    const question = (body.question ?? '').trim();
    if (!question) return json({ error: 'question is required' }, 400);

    const matchCount = Math.min(Math.max(body.match_count ?? 6, 1), 12);
    const admin = adminClient();

    // 1) Embed
    let embedding: number[];
    try {
      embedding = await foundryEmbed(question);
    } catch (err) {
      return json({
        answer: 'AI belum dikonfigurasi. Set Foundry secrets di Supabase Dashboard untuk mengaktifkan Library RAG.',
        citations: [],
        used_ai: false,
        error: (err as Error).message,
      });
    }

    // 2) Vector search via RPC
    const { data: chunks, error: rpcErr } = await supabase.rpc('match_library_chunks', {
      _org_id: organization_id,
      _query_embedding: embedding,
      _match_count: matchCount,
      _min_similarity: 0.3,
    });
    console.log('chunks found:', chunks?.length, 'rpc error:', rpcErr);
    if (rpcErr) return json({ error: rpcErr.message }, 500);
    if (!chunks || chunks.length === 0) {
      return json({
        answer: 'Tidak ditemukan dokumen yang relevan di Library Anda. Coba upload dokumen dulu di menu Impactory Library.',
        citations: [],
        used_ai: true,
      });
    }

    // 3) Compose RAG prompt
    const context = (chunks as any[])
      .map((c, i) => '[' + (i + 1) + '] (doc: ' + (c.document_title ?? c.document_id) + ')\n' + c.content)
      .join('\n\n');

    const answer = await foundryChat(
      [
        {
          role: 'system',
          content:
            'Kamu adalah asisten Impactory Library. Jawab pertanyaan user HANYA berdasarkan konteks yang diberikan. ' +
            'Jika informasi tidak ada di konteks, katakan kamu tidak tahu. Sertakan nomor sitasi [1], [2] di akhir kalimat ' +
            'yang menggunakan info dari konteks tersebut. Bahasa Indonesia profesional.',
        },
        {
          role: 'user',
          content: 'KONTEKS:\n' + context + '\n\nPERTANYAAN: ' + question,
        },
      ],
      { temperature: 0.2, max_tokens: 800 },
    );

    const citations = (chunks as any[]).map((c, i) => ({
      n: i + 1,
      document_id: c.document_id,
      document_title: c.document_title,
      chunk_index: c.chunk_index,
      similarity: c.similarity,
      excerpt: (c.content ?? '').slice(0, 240),
    }));

    await admin.from('ai_generations').insert({
      organization_id,
      user_id: user.id,
      feature: 'library_rag',
      metadata: { question, citations: citations.length },
    });

    return json({ answer, citations, used_ai: true });
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
