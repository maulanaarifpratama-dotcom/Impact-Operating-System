import { Bookmark, BookmarkCheck, CalendarClock, Coins, MapPin, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type Grant,
  type OrgProfile,
  ORIGIN_LABEL,
  GEO_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  URGENCY_TONE,
  daysUntil,
  deadlineUrgency,
  formatAmountRange,
} from '@/lib/grantfinder/types';
import { matchScore, matchTier } from '@/lib/grantfinder/matching';
import type { SavedApplication } from '@/lib/grantfinder/types';

interface GrantCardProps {
  grant: Grant;
  profile: OrgProfile | null;
  saved: SavedApplication | null;
  onOpen: () => void;
  onToggleSave: () => void;
}

const originTone: Record<Grant['origin'], string> = {
  lokal: 'bg-accent/10 text-accent border-accent/30',
  internasional: 'bg-primary/10 text-primary border-primary/20',
  multilateral: 'bg-warning/15 text-warning border-warning/30',
  korporat: 'bg-secondary text-secondary-foreground border-border',
};

function deadlineLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return 'Sudah lewat';
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  if (d <= 30) return `${d} hari lagi`;
  const date = new Date(iso);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GrantCard({ grant, profile, saved, onOpen, onToggleSave }: GrantCardProps) {
  const score = profile ? matchScore(grant, profile) : null;
  const tier = score !== null ? matchTier(score) : null;
  const urgency = deadlineUrgency(grant.deadline);

  return (
    <Card className="group relative flex flex-col gap-4 overflow-hidden p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{grant.donor}</p>
          <button
            type="button"
            onClick={onOpen}
            className="block w-full text-left text-base font-semibold leading-snug hover:text-accent focus:outline-none"
          >
            {grant.title}
          </button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleSave}
          aria-label={saved ? 'Hapus dari shortlist' : 'Simpan ke shortlist'}
          className={cn('h-8 w-8 shrink-0', saved && 'text-accent')}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={cn('text-[11px]', originTone[grant.origin])}>
          {ORIGIN_LABEL[grant.origin]}
        </Badge>
        {tier && (
          <Badge variant="outline" className={cn('gap-1 text-[11px]', tier.tone)}>
            <Sparkles className="h-3 w-3" />
            {tier.label} · {score}
          </Badge>
        )}
        {saved && (
          <Badge variant="outline" className={cn('text-[11px]', STATUS_TONE[saved.status])}>
            {STATUS_LABEL[saved.status]}
          </Badge>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{grant.summary}</p>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Coins className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-foreground">
            {formatAmountRange(grant.amountMinIdr, grant.amountMaxIdr)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{grant.geography.map((g) => GEO_LABEL[g] ?? g).join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarClock className={cn('h-3.5 w-3.5 shrink-0', urgency === 'urgent' && 'text-destructive')} />
          <Badge variant="outline" className={cn('text-[10px] font-normal', URGENCY_TONE[urgency])}>
            {deadlineLabel(grant.deadline)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex flex-wrap gap-1">
          {grant.sdgs.slice(0, 4).map((n) => (
            <span
              key={n}
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground"
              title={`SDG ${n}`}
            >
              {n}
            </span>
          ))}
          {grant.sdgs.length > 4 && (
            <span className="inline-flex h-5 items-center justify-center rounded px-1 text-[10px] text-muted-foreground">
              +{grant.sdgs.length - 4}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-accent hover:bg-accent/10 hover:text-accent" onClick={onOpen}>
          Lihat detail →
        </Button>
      </div>
    </Card>
  );
}