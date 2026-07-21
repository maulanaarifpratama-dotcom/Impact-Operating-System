// supabase/functions/grant-writer-chat/index.ts
// Streaming chat endpoint for the Grant Writer assistant.
// Frontend (<GrantWriterChat />) calls this with a project_id + last user message;
// we load history from gw_chat_messages, send to Azure Foundry, stream tokens back via SSE,
// then persist the assistant reply.
//
// Secrets required in Supabase Dashboard > Edge Functions > Secrets:
//   AZURE_FOUNDRY_ENDPOINT          e.g. https://<resource>.openai.azure.com
//   AZURE_FOUNDRY_API_KEY           the key from Azure portal
//   AZURE_FOUNDRY_CHAT_DEPLOYMENT   name of your chat model deployment (e.g. gpt-4o)
//     (legacy alias: AZURE_FOUNDRY_DEPLOYMENT)
//   AZURE_FOUNDRY_API_VERSION       e.g. 2024-10-21
//   SUPABASE_URL                    (auto-injected)
//   SUPABASE_ANON_KEY               (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY       (auto-injected)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate, AuthError } from '../_shared/auth.ts';
import { chatCompletionStream, foundryEmbed } from '../_shared/foundry.ts';

const SYSTEM_PROMPT = [
  'Kamu adalah Grant Writer Assistant untuk Impactory.id, platform AI untuk NGO/yayasan/social enterprise di Indonesia.',
  'Kamu membantu user menyusun proposal hibah berbasis Logical Framework Approach (LFA).',
  'Selalu jawab dalam Bahasa Indonesia yang profesional namun ramah, kecuali user meminta bahasa lain.',
  'Saat membantu mengisi wizard, ajukan pertanyaan klarifikasi yang spesifik, ringkas, dan terarah.',
  'Berikan saran konkret yang bisa langsung di-copy ke field wizard.',
  'Jangan mengarang data donor atau angka. Jika tidak tahu, katakan tidak tahu.',
].join(' ');

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate caller and get scoped clients
    const ctx = await authenticate(req);
    const { userId, supabase, supabaseAdmin } = ctx;

    const body = await req.json();
    const { project_id, message } = body as { project_id: string; message: string };

    if (!project_id || !message) {
      return new Response(JSON.stringify({ error: 'project_id and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify project belongs to user's org (RLS enforces access automatically)
    const { data: project, error: projErr } = await supabase
      .from('gw_projects')
      .select('id, title, sector, summary, organization_id')
      .eq('id', project_id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const organizationId = project.organization_id;

    // Load last 20 chat messages for context
    const { data: history } = await supabase
      .from('gw_chat_messages')
      .select('role, content')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const historyAsc = (history ?? []).reverse();

    // Persist the user message immediately using admin client
    await supabaseAdmin.from('gw_chat_messages').insert({
      project_id,
      organization_id: organizationId,
      user_id: userId,
      role: 'user',
      content: message,
    });

    // Retrieve library RAG context if organization has any library documents.
    let ragContext = '';
    try {
      const { count, error: countErr } = await supabase
        .from('library_documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (countErr) {
        console.error('Failed to pre-check library documents count:', countErr.message);
      } else if (count && count > 0) {
        const baseQuery = `${project.title || ''} ${project.sector || ''} ${project.summary || ''}`.trim();
        if (baseQuery) {
          const embedding = await foundryEmbed(baseQuery);
          const { data: chunks, error: rpcErr } = await supabase.rpc('match_library_chunks', {
            _org_id: organizationId,
            _query_embedding: embedding,
            _match_count: 5,
            _min_similarity: 0.35,
            _user_id: userId,
          });

          if (rpcErr) {
            console.error('match_library_chunks RPC error in grant-writer-chat:', rpcErr);
          } else if (chunks && chunks.length > 0) {
            const chunkContents = (chunks as any[])
              .map((c: any) => c.content || '')
              .filter(Boolean)
              .join('\n');

            if (chunkContents) {
              ragContext = `\n\n---REFERENSI DARI IMPACT LIBRARY ORGANISASI---\n${chunkContents}\n---END REFERENSI---\n\nGunakan referensi ini sebagai konteks tambahan saat membantu \nuser menulis proposal. Prioritaskan pendekatan, data, dan \nframing yang konsisten dengan dokumen organisasi tersebut.`;
            }
          }
        }
      }
    } catch (ragErr) {
      console.error('Failed to inject RAG context in grant-writer-chat:', (ragErr as Error).message);
    }

    const finalSystemPrompt = SYSTEM_PROMPT + ragContext;

    const messages = [
      { role: 'system' as const, content: finalSystemPrompt },
      ...historyAsc.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Stream response from Foundry via SSE
    const encoder = new TextEncoder();
    let fullText = '';
    let aiUsage: { prompt_tokens: number; completion_tokens: number } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletionStream({ messages, temperature: 0.5, max_tokens: 1024 })) {
            if (chunk.usage) {
              aiUsage = {
                prompt_tokens: chunk.usage.prompt_tokens,
                completion_tokens: chunk.usage.completion_tokens,
              };
            }
            if (chunk.delta) {
              fullText += chunk.delta;
              controller.enqueue(
                encoder.encode('data: ' + JSON.stringify({ delta: chunk.delta }) + '\n\n'),
              );
            }
            if (chunk.done) break;
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Persist assistant reply (fire-and-forget after stream closes)
          await supabaseAdmin.from('gw_chat_messages').insert({
            project_id,
            organization_id: organizationId,
            user_id: userId,
            role: 'assistant',
            content: fullText,
          });
          try {
            const { error: telemetryError } = await supabaseAdmin.from('ai_generations').insert({
              organization_id: organizationId,
              user_id: userId,
              product: 'grant_writer',
              prompt_tokens: aiUsage?.prompt_tokens ?? null,
              completion_tokens: aiUsage?.completion_tokens ?? null,
              metadata: { project_id },
            });

            if (telemetryError) {
              console.warn('[grant-writer-chat] AI usage telemetry insert failed');
            }
          } catch {
            console.warn('[grant-writer-chat] AI usage telemetry insert failed');
          }
        } catch (err) {
          const msg = (err as Error).message ?? 'stream error';
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify({ error: msg }) + '\n\n'),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
