import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  Coins,
  ExternalLink,
  MapPin,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ApplicationStatus,
  type Grant,
  type OrgProfile,
  GEO_LABEL,
  ORIGIN_LABEL,
  SECTOR_LABEL,
  SDG_LABELS,
  STAGE_LABEL,
  STATUS_LABEL,
  URGENCY_TONE,
  daysUntil,
  deadlineUrgency,
  formatAmountRange,
} from '@/lib/grantfinder/types';
import { matchScore, matchTier } from '@/lib/grantfinder/matching';
import type { SavedApplication } from '@/lib/grantfinder/types';

interface GrantDetailDialogProps {
  grant: Grant | null;
  profile: OrgProfile | null;
  saved: SavedApplication | null;
  onClose: () => void;
  onSave: (status: ApplicationStatus, notes?: string) => void;
  onRemove: () => void;
}

const STATUS_OPTIONS: ApplicationStatus[] = [
  'interested',
  'draft',
  'submitted',
  'shortlisted',
  'awarded',
  'rejected',
];

function deadlineLabel(iso: string): string {
  const d = daysUntil(iso);
  const date = new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  if (d < 0) return `${date} (sudah lewat)`;
  if (d === 0) return `${date} (hari ini)`;
  return `${date} (${d} hari lagi)`;
}

export function GrantDetailDialog({
  grant,
  profile,
  saved,
  onClose,
  onSave,
  onRemove,
}: GrantDetailDialogProps) {
  const [status, setStatus] = useState<ApplicationStatus>(saved?.status ?? 'interested');
  const [notes, setNotes] = useState(saved?.notes ?? '');

  useEffect(() => {
    setStatus(saved?.status ?? 'interested');
    setNotes(saved?.notes ?? '');
  }, [saved, grant?.id]);

  if (!grant) return null;

  const score = profile ? matchScore(grant, profile) : null;
  const tier = score !== null ? matchTier(score) : null;
  const urgency = deadlineUrgency(grant.deadline);

  return (
    <Dialog open={!!grant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              {ORIGIN_LABEL[grant.origin]}
            </Badge>
            {tier && (
              <Badge variant="outline" className={cn('gap-1 text-[11px]', tier.tone)}>
                <Sparkles className="h-3 w-3" />
                {tier.label} · {score}
              </Badge>
            )}
            {grant.recurring && (
              <Badge variant="outline" className="text-[11px]">
                Tersedia berulang
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl leading-snug">{grant.title}</DialogTitle>
          <DialogDescription className="text-sm">{grant.donor}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Quick facts */}
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Coins className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Nilai hibah</p>
                <p className="text-sm font-semibold">
                  {formatAmountRange(grant.amountMinIdr, grant.amountMaxIdr)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <Badge variant="outline" className={cn('mt-0.5 text-[11px]', URGENCY_TONE[urgency])}>
                  {deadlineLabel(grant.deadline)}
                </Badge>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Wilayah</p>
                <p className="text-sm font-medium">
                  {grant.geography.map((g) => GEO_LABEL[g] ?? g).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Tentang program</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{grant.summary}</p>
          </section>

          {/* Tags */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektor</h4>
              <div className="flex flex-wrap gap-1.5">
                {grant.sectors.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">
                    {SECTOR_LABEL[s]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">SDG fokus</h4>
              <div className="flex flex-wrap gap-1.5">
                {grant.sdgs.map((n) => (
                  <Badge key={n} variant="outline" className="text-[11px]" title={SDG_LABELS[n]}>
                    SDG {n} · {SDG_LABELS[n]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tahap organisasi</h4>
              <div className="flex flex-wrap gap-1.5">
                {grant.eligibleStages.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">
                    {STAGE_LABEL[s]}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          {/* Eligibility & requirements */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Eligibility</h3>
              <ul className="space-y-1.5">
                {grant.eligibility.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Dokumen yang diperlukan</h3>
              <ul className="space-y-1.5">
                {grant.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Tracker controls */}
          <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">Tracker aplikasi saya</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Catatan internal (opsional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: PIC Budi, target submit 20 Mei, butuh surat dukungan dinas"
                  className="mt-1 min-h-[72px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onSave(status, notes)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saved ? 'Update tracker' : 'Simpan ke tracker'}
              </Button>
              {saved && (
                <Button variant="outline" onClick={onRemove} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Hapus
                </Button>
              )}
              <Button asChild variant="outline">
                <a href={grant.applicationUrl} target="_blank" rel="noreferrer">
                  Halaman aplikasi
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              {grant.donorWebsite && (
                <Button asChild variant="ghost" size="sm">
                  <a href={grant.donorWebsite} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Website donor
                  </a>
                </Button>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}