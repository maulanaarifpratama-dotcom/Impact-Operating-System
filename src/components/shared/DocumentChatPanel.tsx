import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Send,
  Upload,
  X,
  MessageSquare,
  Sparkles,
  Loader2,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DocumentChatPanelProps {
  orgId: string;
  sourceModule: 'grant_writer' | 'meal_planner' | 'lfa_builder' | 'library';
  sourceRecordId: string;
}

interface Document {
  id: string;
  title: string;
  status: 'processing' | 'indexed' | 'failed' | 'uploaded';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ n: number; title: string; id: string }>;
  isStreaming?: boolean;
}

export function DocumentChatPanel({ orgId, sourceModule, sourceRecordId }: DocumentChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chatLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Fetch scoped library documents on mount and after uploads
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('library_documents')
        .select('id, title, status')
        .eq('organization_id', orgId)
        .eq('source_module', sourceModule)
        .eq('source_record_id', sourceRecordId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch documents:', error);
      } else {
        setDocs((data || []) as Document[]);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (orgId && sourceRecordId) {
      fetchDocuments();
    }
  }, [orgId, sourceModule, sourceRecordId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Handle PDF/Txt File Ingestion
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      toast({
        title: 'Format File Tidak Didukung',
        description: 'Silakan unggah dokumen berformat PDF atau TXT saja.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) { // 15MB size limit
      toast({
        title: 'File Terlalu Besar',
        description: 'Batas maksimum ukuran file adalah 15MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('Sesi autentikasi telah habis.');
        }

        const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string;
        const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

        const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/library-ingest`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            org_id: orgId,
            file_base64: base64String,
            file_name: file.name,
            file_type: file.type,
            source_module: sourceModule,
            source_record_id: sourceRecordId,
          }),
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.error || `Error ${response.status}`);
        }

        toast({
          title: 'Unggah Sukses',
          description: `Dokumen "${file.name}" berhasil diindeks ke dalam library.`,
        });

        fetchDocuments();
      };
    } catch (err) {
      console.error('Upload failed:', err);
      toast({
        title: 'Pengunggahan Gagal',
        description: (err as Error).message || 'Gagal memproses dokumen library.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle conversational chat submission
  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text || streaming) return;
    setInputValue('');

    const userMessage: Message = {
      id: 'local-user-' + Date.now(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);

    const assistantId = 'local-assistant-' + Date.now();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) throw new Error('Missing session token');

      const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string;
      const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/library-chat`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          org_id: orgId,
          user_message: text,
          source_module: sourceModule,
          source_record_id: sourceRecordId,
          conversation_history: messages
            .filter((m) => !m.isStreaming)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Edge Function error ${response.status}`);
      }

      // Try reading custom cited chunks header
      let citations: Message['citations'] = undefined;
      const rawCitationsHeader = response.headers.get('X-Cited-Chunks');
      if (rawCitationsHeader) {
        try {
          citations = JSON.parse(decodeURIComponent(atob(rawCitationsHeader)));
        } catch (err) {
          console.warn('Failed to parse citations header:', err);
        }
      }

      if (!response.body) throw new Error('No body returned from stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data:')) continue;
          
          const payload = cleanLine.slice(5).trim();
          if (payload === '[DONE]') continue;

          try {
            const dataObj = JSON.parse(payload);
            if (dataObj.delta) {
              accumulatedText += dataObj.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedText, citations }
                    : m
                )
              );
            }
          } catch {
            /* ignore JSON parse errors of broken chunks */
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err) {
      console.error('Chat failed:', err);
      toast({
        title: 'Koneksi AI Gagal',
        description: (err as Error).message || 'Terjadi kesalahan saat berkomunikasi dengan asisten.',
        variant: 'destructive',
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Maaf, terjadi kesalahan saat menghubungi asisten AI library.', isStreaming: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Floating expand/collapse trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-indigo-500 focus:outline-none"
        title="Impact Library Chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Main Right Sidebar Panel */}
      <div
        className={cn(
          'fixed bottom-0 right-0 top-0 z-45 flex h-full w-[380px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Document Chat Panel</h2>
              <p className="text-[10px] text-muted-foreground">NotebookLLM-style per fitur</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Library Documents Management Area */}
        <div className="border-b p-4 bg-muted/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Dokumen Terkait ({docs.length})
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              Unggah Dokumen
            </Button>
          </div>

          {/* Quick List of Active Documents */}
          {loadingDocs ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-3 text-center bg-card">
              <p className="text-[11px] text-muted-foreground">
                Tidak ada dokumen terkait. Silakan upload terlebih dahulu.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[100px] overflow-y-auto">
              <div className="space-y-1.5 pr-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded border border-border/50 bg-card p-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate font-medium text-foreground" title={doc.title}>
                        {doc.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Conversational Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {docs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-4 gap-3">
              <div className="rounded-full bg-indigo-50 p-4 dark:bg-indigo-950/20">
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Tidak ada dokumen terkait. Silakan upload terlebih dahulu untuk memulai diskusi berbasis referensi dokumen.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-4 gap-2">
              <div className="rounded-full bg-indigo-50 p-3 dark:bg-indigo-950/10 text-indigo-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-foreground">Mulai Tanya Jawab</p>
              <p className="text-[11px] text-muted-foreground max-w-[220px]">
                Ketik pertanyaan untuk membedah dokumen yang Anda unggah secara otomatis.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col gap-1 max-w-[85%] rounded-lg p-3 text-sm',
                  m.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white rounded-br-none'
                    : 'mr-auto bg-muted/40 border border-border text-foreground rounded-bl-none'
                )}
              >
                <p className="leading-relaxed whitespace-pre-line">{m.content}</p>

                {/* Citations chip */}
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                  <div className="mt-2 border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
                    <span className="font-semibold block mb-0.5">Sumber:</span>
                    <div className="flex flex-wrap gap-1">
                      {m.citations.map((c) => (
                        <span
                          key={c.id + '-' + c.n}
                          className="inline-flex items-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1 py-0.5 font-medium shrink-0 truncate max-w-[150px]"
                          title={c.title}
                        >
                          Dokumen [{c.n}]
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Bar Area */}
        <div className="border-t p-3 bg-muted/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={
                docs.length === 0
                  ? 'Harap upload dokumen dahulu...'
                  : 'Tanyakan sesuatu tentang dokumen...'
              }
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={docs.length === 0 || streaming}
            />
            <Button
              onClick={handleSendMessage}
              disabled={docs.length === 0 || streaming || !inputValue.trim()}
              size="icon"
              className="bg-indigo-600 text-white hover:bg-indigo-500 h-9 w-9 shrink-0"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
