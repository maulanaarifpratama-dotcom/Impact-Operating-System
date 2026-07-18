import { cn } from '@/lib/utils';

export function Logo({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'light' }) {
  const isLight = variant === 'light';

  return (
    <div className={cn('inline-flex items-center gap-2.5 font-display font-bold text-lg tracking-tight', className)}>
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
          isLight ? 'bg-white/5 text-white border border-white/10' : 'bg-muted/30 text-foreground border border-border',
        )}
      >
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" role="img" aria-label="Logo Impactory">
          <defs>
            <linearGradient id="logo-teal-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="brand-border" />
              <stop offset="100%" stopColor="brand-active" />
            </linearGradient>
            <linearGradient id="logo-amber-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="brand-amber" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          {/* Baseline/Track */}
          <rect x="6" y="8" width="3" height="16" rx="1.5" fill={isLight ? '#ffffff' : 'brand-border'} opacity={isLight ? 0.15 : 0.25} />
          {/* Top block */}
          <rect x="12" y="6" width="14" height="3.5" rx="1.5" fill="url(#logo-amber-grad)" />
          {/* Vertical pillar */}
          <rect x="17.5" y="11.5" width="3.5" height="9" rx="1.5" fill={isLight ? '#ffffff' : 'url(#logo-teal-grad)'} opacity={isLight ? 0.9 : 1} />
          {/* Bottom block */}
          <rect x="12" y="22.5" width="14" height="3.5" rx="1.5" fill="currentColor" />
          {/* Active pipeline node */}
          <circle cx="23.5" cy="16" r="2" fill="url(#logo-amber-grad)" />
        </svg>
      </span>
      <span className={cn('transition-colors duration-200', isLight ? 'text-white' : 'text-foreground')}>
        Impactory<span className="text-accent font-semibold">.id</span>
      </span>
    </div>
  );
}