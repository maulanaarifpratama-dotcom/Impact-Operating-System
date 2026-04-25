import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = 'Tanya AI tentang langkah ini… (Enter untuk kirim, Shift+Enter baris baru)',
}: ChatComposerProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [value]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isStreaming && value.trim()) onSend();
    }
  };

  const canSend = !disabled && !isStreaming && value.trim().length > 0;

  return (
    <div
      className={cn(
        'flex items-end gap-2 rounded-2xl border border-border/70 bg-card px-2.5 py-2 shadow-sm',
        'focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20',
      )}
    >
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm shadow-none focus-visible:ring-0"
      />
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onStop}
          className="h-9 w-9 shrink-0 rounded-xl"
          aria-label="Hentikan respons"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          className="h-9 w-9 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
          aria-label="Kirim pesan"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}