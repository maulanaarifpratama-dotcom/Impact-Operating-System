import { ArrowRight, Bookmark, BookmarkCheck, CalendarClock, Coins, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type Grant,
  type OrgProfile,
  SECTOR_LABEL,
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

/** Indicative IDR→USD rate for display only (not live). */
const USD_RATE = 16_000;

function formatUsdRange(minIdr: number, maxIdr: number): string {
  const minUsd = Math.round(minIdr / USD_RATE / 1000) * 1000;
  const maxUsd = Math.round(maxIdr / USD_RATE / 1000) * 1000;
  const fmt = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (v >= 1_000) return `$${Math.round(v / 1000)}K`;
    return `$${v}`;
  };
  return minUsd === maxUsd ? fmt(minUsd) : `${fmt(minUsd)} – ${fmt(maxUsd)}`;
}

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
  const showUsd = grant.origin === 'internasional' || grant.origin === 'multilateral';

  return (
    <Card className="group relative flex flex-col gap-3.5 overflow-hidden p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elegant">
      {/* Header: Donor + judul + bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-accent">
            {grant.donor}
          </p>
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

      {/* Badge sektor (utama) + match tier + status */}
      <div className="flex flex-wrap gap-1.5">
        {grant.sectors.slice(0, 3).map((s) => (
          <Badge key={s} variant="outline" className="border-accent/30 bg-accent/10 text-accent text-[11px]">
            {SECTOR_LABEL[s]}
          </Badge>
        ))}
        {grant.sectors.length > 3 && (
          <Badge variant="outline" className="text-[11px]">
            +{grant.sectors.length - 3}
          </Badge>
        )}
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

      {/* Meta utama: Deadline + Besaran dana */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className={cn('h-3 w-3', urgency === 'urgent' && 'text-destructive')} />
            Deadline
          </div>
          <Badge variant="outline" className={cn('text-[11px] font-medium', URGENCY_TONE[urgency])}>
            {deadlineLabel(grant.deadline)}
          </Badge>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Coins className="h-3 w-3" />
            Besaran dana
          </div>
          <p className="text-sm font-semibold leading-tight">
            {formatAmountRange(grant.amountMinIdr, grant.amountMaxIdr)}
          </p>
          {showUsd && (
            <p className="text-[10px] text-muted-foreground">≈ {formatUsdRange(grant.amountMinIdr, grant.amountMaxIdr)} USD</p>
          )}
        </div>
      </div>

      {/* CTA Lihat Detail (teal) */}
      <Button
        onClick={onOpen}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Lihat Detail
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </Card>
  );
}