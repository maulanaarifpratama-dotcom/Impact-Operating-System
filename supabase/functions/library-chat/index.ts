// supabase/functions/library-chat/index.ts
// Module-scoped Retrieval-Augmented Generation over the Impactory Library.
//   1. Authenticates user and determines organization_id
//   2. Embeds the user question via Azure OpenAI text-embedding-ada-002
//   3. Calls match_library_chunks() with module and record filters
//   4. Formulates a strict, Indonesian system prompt to prevent hallucination
//   5. Streams the response back with SSE while attaching citations in X-Cited-Chunks header

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient, AuthError } from '../_shared/auth.ts';
import { chatCompletionStream, foundryEmbed } from '../_shared/foundry.ts';

interface ChatInput {
  org_id?: string;
  user_message: string;
  source_module?: string;
  source_record_id?: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req: Request) => {
  // Handle CORS
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id: authOrgId, supabase } = await getUserAndOrg(req);
    const body = (await req.json()) as ChatInput;

    const userMessage = (body.user_message ?? '').trim();
    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'user_message tidak boleh kosong' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const organizationId = body.org_id || authOrgId;
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'org_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Embed user message
    let embedding: number[];
    try {
      embedding = await foundryEmbed(userMessage);
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Gagal menggenerasi embedding untuk pesan user: ' + (err as Error).message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Search chunks with filters
    const { data: chunks, error: rpcErr } = await supabase.rpc('match_library_chunks', {
      _org_id: organizationId,
      _query_embedding: embedding,
      _match_count: 5,
      _min_similarity: 0.35,
      _source_module: body.source_module || null,
      _source_record_id: body.source_record_id || null,
    });

    if (rpcErr) {
      console.error('RPC match_library_chunks error:', rpcErr);
      return new Response(JSON.stringify({ error: 'Gagal mencocokkan dokumen library.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Compose Context
    const activeChunks = chunks as any[] || [];
    const context = activeChunks
      .map((c, i) => `[${i + 1}] (doc: ${c.document_title || 'Dokumen'})\n${c.content}`)
      .join('\n\n');

    // 4) Build System Prompt
    const systemPrompt = `Kamu adalah asisten AI Impactory.

ATURAN:

1. Jawab HANYA berdasarkan konteks dokumen yang diberikan.
2. Jika informasi tidak tersedia di konteks:
   katakan:
   "Informasi ini tidak tersedia dalam dokumen yang diunggah."
   Jangan mencoba melengkapi dari pengetahuan umum atau internet.
3. DILARANG:
   - menambahkan informasi baru
   - mengarang data atau angka
   - membuat asumsi
4. Gunakan Bahasa Indonesia yang sopan dan profesional.
5. Jika relevan, referensikan nomor dokumen [1], [2], dst di akhir kalimat yang mengambil info dari konteks tersebut.

---

KONTEKS:
${context || 'Tidak ada dokumen yang diunggah atau ditemukan relevan.'}
`;

    // 5) Include History
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(body.conversation_history || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    // Prepare citations metadata
    const citations = activeChunks.map((c, i) => ({
      n: i + 1,
      document_id: c.document_id,
      document_title: c.document_title,
      similarity: c.similarity,
    }));

    // Safe base64 header encoding to avoid issues with non-ASCII chars
    const citationsHeader = btoa(encodeURIComponent(JSON.stringify(citations)));

    // 6) Stream SSE response
    const encoder = new TextEncoder();
    let fullText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletionStream({
            messages,
            max_tokens: 1200,
          })) {
            if (chunk.delta) {
              fullText += chunk.delta;
              controller.enqueue(
                encoder.encode('data: ' + JSON.stringify({ delta: chunk.delta }) + '\n\n')
              );
            }
            if (chunk.done) break;
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Persist audit log inside DB
          const admin = adminClient();
          await admin.from('ai_generations').insert({
            organization_id: organizationId,
            user_id: user.id,
            feature: 'library_chat',
            metadata: {
              source_module: body.source_module ?? null,
              source_record_id: body.source_record_id ?? null,
              retrieved_chunks: citations.length,
            },
          });
        } catch (err) {
          const msg = (err as Error).message ?? 'stream error';
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify({ error: msg }) + '\n\n')
          );
          controller.close();
        }
      },
    });

    // MANDATORY LOGGING
    const estimatedTokens = Math.ceil((userMessage.length + systemPrompt.length) / 4);
    console.log(JSON.stringify({
      feature: "library_chat",
      retrievedChunks: citations.length,
      estimatedTokens,
      model: "gpt-4o-mini"
    }));

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Cited-Chunks': citationsHeader,
      },
    });
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
