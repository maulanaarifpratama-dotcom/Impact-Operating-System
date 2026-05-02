import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  runMockAssistant,
  STARTER_PROMPTS,
  type ChatToolCall,
} from '@/lib/grant-writer/chat/mockAi';
import type { WizardData } from '@/lib/grant-writer/types';
import { ChatMessage, type ChatMessageData } from './ChatMessage';
import { ChatComposer } from './ChatComposer';

interface GrantWriterChatProps {
  projectId: string;
  organizationId: string;
  wizardData: WizardData;
  currentStepId: string;
  onApplyAutofill?: (tool: ChatToolCall) => void;
}

// =========================================================================
// Streaming chat: tries the Supabase Edge Function `grant-writer-chat` first.
// If unreachable (404 / network / Foundry not configured), falls back to the
// existing mock assistant so the UI keeps working.
// TODO (USER): once `supabase functions deploy grant-writer-chat` is run AND
// Azure secrets are set in Supabase, this path becomes the live AI.
// =========================================================================
async function streamFromEdge(opts: {
  projectId: string;
  message: string;
  signal: AbortSignal;
  onToken: (chunk: string) => void;
}): Promise<{ usedEdge: boolean; text: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Missing session token');

  const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing Supabase environment variables');

  const url = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/grant-writer-chat';

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ project_id: opts.projectId, message: opts.message }),
    signal: opts.signal,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Edge Function error ${resp.status}: ${errText}`);
  }
  if (!resp.body) throw new Error('Edge Function returned no body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (obj.delta) {
          acc += obj.delta;
          opts.onToken(obj.delta);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { usedEdge: true, text: acc };
}

export function GrantWriterChat({
  projectId,
  organizationId,
  wizardData,
  currentStepId,
  onApplyAutofill,
}: GrantWriterChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [usedLiveAI, setUsedLiveAI] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        setMessages([]);
      } else {
        setMessages(
          (data ?? []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            status: m.status,
            createdAt: m.created_at,
            tools:
              m.tool_name && m.tool_input
                ? [
                    {
                      name: m.tool_name as ChatToolCall['name'],
                      input: (m.tool_input as Record<string, unknown>) ?? {},
                      output: (m.tool_output as Record<string, unknown>) ?? undefined,
                      label: humanLabelForTool(m.tool_name),
                    },
                  ]
                : undefined,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const persistMessage = useCallback(
    async (msg: Omit<ChatMessageData, 'id' | 'createdAt'> & { tools?: ChatToolCall[] }) => {
      if (!user) return null;
      const tool = msg.tools?.[0];
      const { data, error } = await supabase
        .from('gw_chat_messages')
        .insert({
          project_id: projectId,
          organization_id: organizationId,
          user_id: user.id,
          role: msg.role,
          content: msg.content,
          status: msg.status ?? 'complete',
          tool_name: tool?.name ?? null,
          tool_input: (tool?.input as never) ?? null,
          tool_output: (tool?.output as never) ?? null,
        })
        .select('id, created_at')
        .maybeSingle();
      if (error) {
        console.warn('[chat] persist failed (non-fatal):', error.message);
        return null;
      }
      return data;
    },
    [projectId, organizationId, user],
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || streaming) return;
      setInput('');

      const userMsg: ChatMessageData = {
        id: 'local-' + Date.now(),
        role: 'user',
        content: text,
        status: 'complete',
      };
      setMessages((prev) => [...prev, userMsg]);
      // NOTE: edge fn already persists user message; only persist here when fallback is used.

      const assistantId = 'local-' + (Date.now() + 1);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', status: 'pending', tools: [] },
      ]);
      setStreaming(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        let acc = '';
        let edgeResult: { usedEdge: boolean; text: string } | null = null;
        // 1) Try real AI via edge function
        try {
          edgeResult = await streamFromEdge({
            projectId,
            message: text,
            signal: ctrl.signal,
            onToken: (chunk) => {
              acc += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: acc, status: 'streaming' } : m,
                ),
              );
            },
          });
        } catch (edgeErr) {
          console.error('[grant-writer-chat] Edge function failed:', edgeErr);
          toast({
            title: 'Koneksi ke Grant Writer AI gagal',
            description: String(edgeErr),
            variant: 'destructive',
          });
        }

        if (edgeResult?.usedEdge && edgeResult?.text) {
          setUsedLiveAI(true);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: edgeResult!.text, status: 'complete' } : m,
            ),
          );
          // Edge function already persisted both messages; nothing to do here.
        } else {
          // 2) Fallback to mock assistant (offline / pre-Foundry mode)
          setUsedLiveAI(false);
          void persistMessage({ role: 'user', content: text });
          const collectedTools: ChatToolCall[] = [];
          await runMockAssistant({
            userMessage: text,
            wizardData,
            currentStepId,
            signal: ctrl.signal,
            onToken: (chunk) => {
              acc += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: acc, status: 'streaming' } : m,
                ),
              );
            },
            onTool: (tool) => {
              collectedTools.push(tool);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, tools: [...collectedTools] } : m,
                ),
              );
            },
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: acc, status: 'complete' } : m,
            ),
          );
          void persistMessage({
            role: 'assistant',
            content: acc,
            status: 'complete',
            tools: collectedTools,
          });
        }
      } catch (err) {
        const aborted = (err as Error)?.name === 'AbortError';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  status: aborted ? 'complete' : 'error',
                  content:
                    m.content || (aborted ? '_(dihentikan)_' : 'Terjadi kesalahan menjalankan AI.'),
                }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [input, streaming, wizardData, currentStepId, persistMessage, projectId],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(async () => {
    if (!confirm('Hapus seluruh percakapan untuk proyek ini?')) return;
    setMessages([]);
    const { error } = await supabase.from('gw_chat_messages').delete().eq('project_id', projectId);
    if (error) {
      toast({
        title: 'Gagal menghapus chat',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [projectId, toast]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-hero text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Asisten AI</p>
            <p className="text-[11px] text-muted-foreground">
              {usedLiveAI ? 'Live AI' : 'Mock mode'} · konteks: {currentStepId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {usedLiveAI ? (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              AI Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Fallback Mock
            </Badge>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
              aria-label="Hapus percakapan"
              title="Hapus percakapan"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 p-3">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat percakapan…
            </div>
          ) : messages.length === 0 ? (
            <EmptyState onPick={(p) => void handleSend(p)} />
          ) : (
            messages.map((m) => (
              <ChatMessage key={m.id} message={m} onApplyTool={onApplyAutofill} />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 bg-background/40 p-2.5">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={() => void handleSend()}
          onStop={handleStop}
          isStreaming={streaming}
          disabled={loading}
        />
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          {usedLiveAI
            ? 'Powered by Azure AI Foundry · history disimpan ke Supabase per proyek'
            : 'Fallback lokal aktif karena Edge Function gagal · history disimpan ke Supabase per proyek'}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">Mulai percakapan</p>
        <p className="text-xs text-muted-foreground">
          AI akan membantu Anda mengisi tiap langkah wizard.
        </p>
      </div>
      <div className="mt-1 flex w-full flex-col gap-1.5">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.prompt)}
            className="rounded-lg border border-border/70 bg-card px-3 py-2 text-left text-xs transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="font-medium text-foreground">{p.label}</span>
            <span className="block text-[11px] text-muted-foreground">{p.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function humanLabelForTool(name: string): string {
  switch (name) {
    case 'web_search':
      return 'Pencarian web';
    case 'generate_document':
      return 'Generate dokumen';
    case 'autofill_wizard':
      return 'Auto-fill wizard';
    default:
      return name;
  }
}
