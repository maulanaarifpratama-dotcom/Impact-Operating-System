import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

serve(async (req) => {
    const cors = handleCors(req);
    if (cors) return cors;

        try {
              const endpoint = Deno.env.get('AZURE_FOUNDRY_ENDPOINT') || '';
              const apiKey = Deno.env.get('AZURE_FOUNDRY_API_KEY') || '';
              const chatDeployment = Deno.env.get('AZURE_FOUNDRY_CHAT_DEPLOYMENT') || Deno.env.get('AZURE_FOUNDRY_DEPLOYMENT') || '';
              const apiVersion = Deno.env.get('AZURE_FOUNDRY_API_VERSION') || '2024-10-21';

      const status = {
              hasEndpoint: !!endpoint,
              hasApiKey: !!apiKey,
              hasChatDeployment: !!chatDeployment,
              hasApiVersion: !!apiVersion,
              deploymentName: chatDeployment,
              apiVersion: apiVersion,
      };

      if (!endpoint || !apiKey || !chatDeployment) {
              return jsonResponse({
                        error: 'Missing required Foundry environment variables',
                        status,
              }, 500);
      }

      const cleanEndpoint = endpoint.replace(/\/+$/, '');
              const url = `${cleanEndpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=${apiVersion}`;

      // Use max_completion_tokens (compatible with gpt-5/o-series reasoning
      // deployments) and omit temperature/top_p (reasoning deployments only
      // accept the default value 1).
      const res = await fetch(url, {
              method: 'POST',
              headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey,
              },
              body: JSON.stringify({
                        messages: [{ role: 'user', content: 'Reply with exactly OK' }],
                        max_completion_tokens: 50,
              }),
      });

      if (!res.ok) {
              const errText = await res.text();
              return jsonResponse({
                        success: false,
                        status,
                        statusCode: res.status,
                        errorBody: errText,
              }, 500);
      }

      const data = await res.json();
              const reply = data?.choices?.[0]?.message?.content ?? '';
              return jsonResponse({
                      success: true,
                      status,
                      statusCode: res.status,
                      reply,
                      usage: data?.usage,
                      model: data?.model,
              });
        } catch (err) {
              return errorResponse(`Server error: ${(err as Error).message}`, 500);
        }
});
