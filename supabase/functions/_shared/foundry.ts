// supabase/functions/_shared/foundry.ts
// Azure AI Foundry / Azure OpenAI client for edge functions.
//
// Reads secrets from Deno.env (set in Supabase Dashboard > Edge Functions > Secrets):
//   AZURE_FOUNDRY_ENDPOINT          e.g. https://impactory-ai.openai.azure.com
//   AZURE_FOUNDRY_API_KEY           your Azure resource key
//   AZURE_FOUNDRY_CHAT_DEPLOYMENT   deployment name for chat (e.g. gpt-5-5)
//     (legacy alias: AZURE_FOUNDRY_DEPLOYMENT)
//   AZURE_FOUNDRY_EMBED_DEPLOYMENT  deployment name for embeddings
//     (legacy alias: AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT)
//   AZURE_FOUNDRY_API_VERSION       e.g. 2024-10-21 (or any version your deployment supports)
//
// Why this file exists: the frontend is a Vite SPA, so it MUST NOT see the
// Azure key. All Foundry traffic is proxied through Supabase edge functions
// which run on Deno and have access to the secrets above.
//
// NOTE on GPT-5 / o-series reasoning deployments:
//   These deployments REJECT the legacy `max_tokens` parameter and require
//   `max_completion_tokens` instead. They also typically reject custom
//   `temperature` and `top_p` (only the default value 1 is accepted).
//   This file targets the modern shape so it works on both classic chat
//   models and reasoning deployments. Callers SHOULD NOT pass temperature
//   or top_p; if they do, the values are ignored on reasoning deployments.

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    response_format?: { type: 'text' | 'json_object' };
    stream?: boolean;
}

export interface ChatCompletionResponse {
    id: string;
    model: string;
    created: number;
    choices: Array<{
      index: number;
      message: ChatMessage;
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
}

export interface EmbeddingResponse {
    data: Array<{ embedding: number[]; index: number }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
}

export class FoundryConfigError extends Error {
    constructor(missing: string) {
          super(`Missing Foundry secret: ${missing}. Set it in Supabase Dashboard > Edge Functions > Secrets.`);
          this.name = 'FoundryConfigError';
    }
}

/**
 * Read an env var, falling back through legacy aliases.
 * Returns the first non-empty value found, or undefined.
 */
function readEnv(...names: string[]): string | undefined {
    for (const n of names) {
          const v = Deno.env.get(n);
          if (v && v.trim().length > 0) return v;
    }
    return undefined;
}

function getConfig() {
    const endpoint = readEnv('AZURE_FOUNDRY_ENDPOINT');
    const apiKey = readEnv('AZURE_FOUNDRY_API_KEY');
    const chatDeployment = readEnv(
          'AZURE_FOUNDRY_CHAT_DEPLOYMENT',
          'AZURE_FOUNDRY_DEPLOYMENT',
        );
    const embedDeployment = readEnv(
          'AZURE_FOUNDRY_EMBED_DEPLOYMENT',
          'AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT',
        );
    const apiVersion = readEnv('AZURE_FOUNDRY_API_VERSION') ?? '2024-10-21';

  if (!endpoint) throw new FoundryConfigError('AZURE_FOUNDRY_ENDPOINT');
    if (!apiKey) throw new FoundryConfigError('AZURE_FOUNDRY_API_KEY');
    if (!chatDeployment) throw new FoundryConfigError('AZURE_FOUNDRY_CHAT_DEPLOYMENT');

  const cleanEndpoint = endpoint.replace(/\/+$/, '');
    return { endpoint: cleanEndpoint, apiKey, chatDeployment, embedDeployment, apiVersion };
}

/**
 * Non-streaming chat completion. Returns the full response.
 * Uses `max_completion_tokens` (compatible with GPT-5 / o-series reasoning
 * deployments AND modern chat completions deployments).
 * `temperature` / `top_p` are intentionally NOT sent because reasoning
 * deployments reject any non-default value.
 */
export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const cfg = getConfig();
    const url = `${cfg.endpoint}/openai/deployments/${cfg.chatDeployment}/chat/completions?api-version=${cfg.apiVersion}`;

  const body: Record<string, unknown> = {
        messages: req.messages,
        max_completion_tokens: req.max_tokens ?? 4000,
        stream: false,
  };
    if (req.response_format) body.response_format = req.response_format;

  const res = await fetch(url, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'api-key': cfg.apiKey,
        },
        body: JSON.stringify(body),
  });

  if (!res.ok) {
        throw new Error(`Foundry chat error ${res.status}`);
  }

  return await res.json();
}

/**
 * Streaming chat completion. Returns an async iterable of content deltas.
 * Use this for chat UIs that show typing-style output.
 */
export async function* chatCompletionStream(
    req: ChatCompletionRequest,
  ): AsyncGenerator<{ delta: string; done: boolean; usage?: ChatCompletionResponse['usage'] }> {
    const cfg = getConfig();
    const url = `${cfg.endpoint}/openai/deployments/${cfg.chatDeployment}/chat/completions?api-version=${cfg.apiVersion}`;

  const body: Record<string, unknown> = {
        messages: req.messages,
        max_completion_tokens: req.max_tokens ?? 4000,
        stream: true,
        stream_options: { include_usage: true },
  };

  const res = await fetch(url, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'api-key': cfg.apiKey,
        },
        body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
        throw new Error(`Foundry stream error ${res.status}`);
  }

  const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastUsage: ChatCompletionResponse['usage'] | undefined;

  while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
                const line = raw.trim();
                if (!line || !line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') {
                          yield { delta: '', done: true, usage: lastUsage };
                          return;
                }
                try {
                          const json = JSON.parse(payload);
                          if (json.usage) lastUsage = json.usage;
                          const delta = json.choices?.[0]?.delta?.content ?? '';
                          if (delta) yield { delta, done: false };
                } catch {
                          // ignore malformed chunks
                }
        }
  }
    yield { delta: '', done: true, usage: lastUsage };
}

/**
 * Generate embeddings for an array of input strings.
 */
export async function embed(input: string | string[]): Promise<EmbeddingResponse> {
    const cfg = getConfig();
    if (!cfg.embedDeployment) {
          throw new FoundryConfigError('AZURE_FOUNDRY_EMBED_DEPLOYMENT');
    }
    const url = `${cfg.endpoint}/openai/deployments/${cfg.embedDeployment}/embeddings?api-version=${cfg.apiVersion}`;

  const res = await fetch(url, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'api-key': cfg.apiKey,
        },
        body: JSON.stringify({ input: Array.isArray(input) ? input : [input] }),
  });

  if (!res.ok) {
        throw new Error(`Foundry embed error ${res.status}`);
  }

  return await res.json();
}

/**
 * Convenience: a chat call that REQUIRES a JSON response.
 */
export async function chatJson<T = unknown>(req: Omit<ChatCompletionRequest, 'response_format'>): Promise<{
  data: T;
  usage: ChatCompletionResponse['usage'];
  model: string;
}> {
  const res = await chatCompletion({
    ...req,
    response_format: { type: 'json_object' },
  });
  const choice = res.choices[0];
  const raw = choice?.message?.content ?? '';
  const finishReason = choice?.finish_reason ?? 'unknown';
  // Defensive diagnostics — never logs secrets, only response shape.
  if (!raw || raw.trim().length === 0) {
    console.error('[foundry] chatJson empty content:', finishReason);
    throw new Error(
      `Foundry returned empty content (finish_reason=${finishReason}, model=${res.model}, completion_tokens=${res.usage?.completion_tokens ?? 0}). ` +
      'This usually means the completion budget was consumed by reasoning before any visible output was emitted. Increase max_tokens for this call.',
    );
  }
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch (err) {
    console.error('[foundry] chatJson invalid JSON:', finishReason);
    throw new Error(`Foundry returned invalid JSON: ${(err as Error).message}\n--- raw ---\n${raw.slice(0, 800)}`);
  }
  return { data, usage: res.usage, model: res.model };
}
// ---------------------------------------------------------------------------
// Convenience wrappers used by most Edge Functions.
// ---------------------------------------------------------------------------

export async function foundryChat(
    messages: ChatMessage[],
    opts?: Pick<ChatCompletionRequest, 'temperature' | 'max_tokens'>,
  ): Promise<string> {
    const res = await chatCompletion({ messages, ...opts });
    return res.choices[0]?.message?.content ?? '';
}

export async function foundryJSON<T = unknown>(
  messages: ChatMessage[],
  opts?: Pick<ChatCompletionRequest, 'temperature' | 'max_tokens'>,
): Promise<T> {
  const res = await chatCompletion({
    messages,
    response_format: { type: 'json_object' },
    ...opts,
  });
  const choice = res.choices[0];
  const raw = choice?.message?.content ?? '';
  const finishReason = choice?.finish_reason ?? 'unknown';
  if (!raw || raw.trim().length === 0) {
    console.error('[foundry] foundryJSON empty content:', finishReason);
    throw new Error(
      `Foundry returned empty content (finish_reason=${finishReason}, model=${res.model}, completion_tokens=${res.usage?.completion_tokens ?? 0}). ` +
      'This usually means the completion budget was consumed by reasoning before any visible output was emitted. Increase max_tokens for this call.',
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Foundry returned invalid JSON: ${(err as Error).message}\n--- raw ---\n${raw.slice(0, 800)}`);
  }
}

export async function foundryEmbed(text: string): Promise<number[]> {
    const res = await embed(text);
    const vec = res.data[0]?.embedding;
    if (!vec) throw new Error('Foundry embed returned no vector');
    return vec;
}

export async function* foundryStream(
    messages: ChatMessage[],
    opts?: Pick<ChatCompletionRequest, 'temperature' | 'max_tokens'>,
  ): AsyncGenerator<string> {
    for await (const chunk of chatCompletionStream({ messages, ...opts })) {
          if (chunk.delta) yield chunk.delta;
          if (chunk.done) return;
    }
}
