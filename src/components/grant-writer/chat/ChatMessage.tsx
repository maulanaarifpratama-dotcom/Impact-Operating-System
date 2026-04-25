import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Wrench, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ChatToolCall } from '@/lib/grant-writer/chat/mockAi';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  tools?: ChatToolCall[];
  createdAt?: string;
}

function MessageBody({ role, content, status }: ChatMessageData) {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
  }
  if (status === 'pending' && !content) {
    return (
      <div className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-sm leading-relaxed',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-p:text-foreground/90 prose-strong:text-foreground',
        'prose-li:my-0.5 prose-li:text-foreground/90',
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
        'prose-a:text-accent prose-a:underline-offset-2 hover:prose-a:underline',
        'prose-blockquote:border-l-accent prose-blockquote:text-muted-foreground prose-blockquote:font-normal prose-blockquote:not-italic',
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {status === 'streaming' && (
        <span className="inline-block h-3 w-1 -mb-0.5 ml-0.5 animate-pulse bg-foreground/60 align-middle" />
      )}
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onApplyTool,
}: {
  message: ChatMessageData;
  onApplyTool?: (tool: ChatToolCall) => void;
}) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  return (
    <div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
          isUser
            ? 'bg-primary text-primary-foreground'
            : isError
              ? 'bg-destructive/15 text-destructive'
              : 'bg-accent/15 text-accent',
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : isError ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={cn(
          'flex max-w-[88%] flex-col gap-1.5',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5',
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-border/70 bg-card',
            isError && 'border-destructive/40 bg-destructive/5',
          )}
        >
          <MessageBody {...message} />
        </div>

        {message.tools && message.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.tools.map((tool, i) => (
              <Badge
                key={`${tool.name}-${i}`}
                variant="outline"
                className="gap-1 border-accent/30 bg-accent/5 font-normal text-accent"
              >
                <Wrench className="h-3 w-3" />
                {tool.label}
              </Badge>
            ))}
            {onApplyTool &&
              message.tools
                .filter((t) => t.name === 'autofill_wizard')
                .map((tool, i) => (
                  <button
                    key={`apply-${i}`}
                    type="button"
                    onClick={() => onApplyTool(tool)}
                    className="rounded-full border border-accent bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    Terapkan ke wizard
                  </button>
                ))}
          </div>
        )}
      </div>
    </div>
  );
});