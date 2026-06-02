import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

serve(async (req) => {
    const cors = handleCors(req);
    if (cors) return cors;

        try {
              const endpoint = Deno.env.get('AZURE_FOUNDRY_ENDPOINT') || '';
              const apiKey = Deno.env.get('AZURE_FOUNDRY_API_KEY') || '';
              const chatDeployment = Deno.env.get('AZURE_FOUNDRY_CHAT_DEPLOYMENT') || Deno.env.get('AZURE_FOUNDRY_DEPLOYMENT') || '';
              const apiVersion = Deno.env.get('AZURE_FOUNDRY_API_VERSION') || '2024-10-21';

      const configured = !!endpoint && !!apiKey && !!chatDeployment;

      if (!configured) {
              console.warn('[foundry-health] missing required Foundry environment variables');
              return jsonResponse({
                        success: false,
                        configured: false,
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
              console.warn('[foundry-health] Foundry health check failed:', res.status);
              return jsonResponse({
                        success: false,
                        configured: true,
              }, 500);
      }

      return jsonResponse({
              success: true,
              configured: true,
      });
        } catch (err) {
              console.error('[foundry-health] server error:', (err as Error).message || 'unknown error');
              return jsonResponse({
                        success: false,
                        configured: false,
              }, 500);
        }
});
