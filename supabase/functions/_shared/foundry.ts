// supabase/functions/_shared/foundry.ts
// Azure AI Foundry / Azure OpenAI client for edge functions.
//
// Reads secrets from Deno.env (set in Supabase Dashboard > Edge Functions > Secrets):
//   AZURE_FOUNDRY_ENDPOINT         e.g. https://impactory-ai.openai.azure.com
//   AZURE_FOUNDRY_API_KEY          your Azure resource key
//   AZURE_FOUNDRY_CHAT_DEPLOYMENT  deployment name for chat (e.g. gpt-5-5)
//   AZURE_FOUNDRY_EMBED_DEPLOYMENT deployment name for embeddings (e.g. text-embedding-3-small)
//   AZURE_FOUNDRY_API_VERSION      e.g. 2024-10-21 (or any version your deployment supports)
//
// Why this file exists: the frontend is a Vite SPA, so it MUST NOT see the
// Azure key. All Foundry traffic is proxied through Supabase edge functions
// which run on Deno and have access to the secrets above.

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

function getConfig() {
  const endpoint = Deno.env.get('AZURE_FOUNDRY_ENDPOINT');
  const apiKey = Deno.env.get('AZURE_FOUNDRY_API_KEY');
  const chatDeployment = Deno.env.get('AZURE_FOUNDRY_CHAT_DEPLOYMENT');
  const embedDeployment = Deno.env.get('AZURE_FOUNDRY_EMBED_DEPLOYMENT');
  const apiVersion = Deno.env.get('AZURE_FOUNDRY_API_VERSION') ?? '2024-10-21';

  if (!endpoint) throw new FoundryConfigError('AZURE_FOUNDRY_ENDPOINT');
  if (!apiKey) throw new FoundryConfigError('AZURE_FOUNDRY_API_KEY');
  if (!chatDeployment) throw new FoundryConfigError('AZURE_FOUNDRY_CHAT_DEPLOYMENT');

  // Strip trailing slash so we can safely concat paths.
  const cleanEndpoint = endpoint.replace(/\/+$/, '');

  return { endpoint: cleanEndpoint, apiKey, chatDeployment, embedDeployment, apiVersion };
}

/**
 * Non-streaming chat completion. Returns the full response.
 */
export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const cfg = getConfig();
  const url = `${cfg.endpoint}/openai/deployments/${cfg.chatDeployment}/chat/completions?api-version=${cfg.apiVersion}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify({
      messages: req.messages,
      temperature: req.temperature ?? 0.4,
      top_p: req.top_p ?? 0.95,
      max_tokens: req.max_tokens ?? 4000,
      ...(req.response_format ? { response_format: req.response_format } : {}),
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Foundry chat error ${res.status}: ${errText.slice(0, 500)}`);
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

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify({
      messages: req.messages,
      temperature: req.temperature ?? 0.4,
      top_p: req.top_p ?? 0.95,
      max_tokens: req.max_tokens ?? 4000,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`Foundry stream error ${res.status}: ${errText.slice(0, 500)}`);
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
 * Uses AZURE_FOUNDRY_EMBED_DEPLOYMENT.
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
    const errText = await res.text();
    throw new Error(`Foundry embed error ${res.status}: ${errText.slice(0, 500)}`);
  }

  return await res.json();
}

/**
 * Convenience: a chat call that REQUIRES a JSON response. Parses and returns
 * the parsed object. Throws if the model returns invalid JSON.
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
  const raw = res.choices[0]?.message?.content ?? '{}';
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Foundry returned invalid JSON: ${(err as Error).message}\n--- raw ---\n${raw.slice(0, 800)}`);
  }
  return { data, usage: res.usage, model: res.model };
}
