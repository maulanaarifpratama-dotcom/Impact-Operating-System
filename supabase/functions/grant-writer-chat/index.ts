// supabase/functions/grant-writer-chat/index.ts
// Streaming chat endpoint for the Grant Writer assistant.
// Frontend (<GrantWriterChat />) calls this with a project_id + last user message;
// we load history from gw_chat_messages, send to Azure Foundry, stream tokens back via SSE,
// then persist the assistant reply.
//
// =========================================================================
// TODO (USER): Set these secrets in Supabase Dashboard > Edge Functions > Secrets:
//   AZURE_FOUNDRY_ENDPOINT       e.g. https://<resource>.openai.azure.com
//   AZURE_FOUNDRY_API_KEY        the key from Azure portal
//   AZURE_FOUNDRY_DEPLOYMENT     name of your chat model deployment (e.g. gpt-5-5, gpt-4o)
//   AZURE_FOUNDRY_API_VERSION    e.g. 2024-10-21 (or newer if supported)
//   SUPABASE_URL                 (auto-injected, but verify)
//   SUPABASE_SERVICE_ROLE_KEY    (auto-injected, but verify)
// Then deploy:  supabase functions deploy grant-writer-chat
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryStream } from '../_shared/foundry.ts';

const SYSTEM_PROMPT = [
  'Kamu adalah Grant Writer Assistant untuk Impactory.id, platform AI untuk NGO/yayasan/social enterprise di Indonesia.',
  'Kamu membantu user menyusun proposal hibah berbasis Logical Framework Approach (LFA).',
  'Selalu jawab dalam Bahasa Indonesia yang profesional namun ramah, kecuali user meminta bahasa lain.',
  'Saat membantu mengisi wizard, ajukan pertanyaan klarifikasi yang spesifik, ringkas, dan terarah.',
  'Berikan saran konkret yang bisa langsung di-copy ke field wizard.',
  'Jangan mengarang data donor atau angka. Jika tidak tahu, katakan tidak tahu.',
].join(' ');

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id, supabase } = await getUserAndOrg(req);
    const body = await req.json();
    const { project_id, message } = body as { project_id: string; message: string };

    if (!project_id || !message) {
      return new Response(JSON.stringify({ error: 'project_id and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify project belongs to user's org (RLS will also enforce this)
    const { data: project, error: projErr } = await supabase
      .from('gw_projects')
      .select('id, title, organization_id')
      .eq('id', project_id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load last 20 chat messages for context
    const { data: history } = await supabase
      .from('gw_chat_messages')
      .select('role, content')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const historyAsc = (history ?? []).reverse();

    // Persist the user message immediately (using admin client to bypass RLS for write)
    const admin = adminClient();
    await admin.from('gw_chat_messages').insert({
      project_id,
      organization_id,
      user_id: user.id,
      role: 'user',
      content: message,
    });

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...historyAsc.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // Stream response from Foundry. If credentials missing, fall back to a polite stub.
    const encoder = new TextEncoder();
    let fullText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const tokenStream = await foundryStream(messages);
          const reader = tokenStream.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            fullText += value;
            controller.enqueue(encoder.encode(
              'data: ' + JSON.stringify({ delta: value }) + '\n\n'
            ));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Persist assistant reply (fire-and-forget; controller already closed)
          await admin.from('gw_chat_messages').insert({
            project_id,
            organization_id,
            user_id: user.id,
            role: 'assistant',
            content: fullText,
          });
          await admin.from('ai_generations').insert({
            organization_id,
            user_id: user.id,
            feature: 'grant_writer_chat',
            input_tokens: null,
            output_tokens: null,
            metadata: { project_id },
          });
        } catch (err) {
          const msg = (err as Error).message ?? 'stream error';
          controller.enqueue(encoder.encode(
            'data: ' + JSON.stringify({ error: msg }) + '\n\n'
          ));
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
