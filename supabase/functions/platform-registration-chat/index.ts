// supabase/functions/platform-registration-chat/index.ts
// Streaming chat proxy for platform registration helper chat.
// Handled server-side to prevent leaking Azure secrets to Vite frontend.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate, AuthError } from '../_shared/auth.ts';
import { chatCompletionStream, ChatMessage } from '../_shared/foundry.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate caller (ensures JWT session is valid)
    const ctx = await authenticate(req);
    const { userId } = ctx;

    const body = await req.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream response from Foundry via SSE
    const encoder = new TextEncoder();
    let fullText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletionStream({ messages, temperature: 0.5, max_tokens: 1500 })) {
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
