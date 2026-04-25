import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'light' }) {
  return (
    <div className={cn('inline-flex items-center gap-2 font-display font-bold text-lg tracking-tight', className)}>
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md',
          variant === 'light' ? 'bg-white/10 text-white' : 'bg-gradient-hero text-white',
        )}
      >
        <Sparkles className="h-4 w-4" />
      </span>
      <span className={variant === 'light' ? 'text-white' : 'text-foreground'}>
        Impactory<span className="text-accent">.id</span>
      </span>
    </div>
  );
}