import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Clock, Download, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type LibraryItem,
  FORMAT_LABEL,
  KIND_LABEL,
  KIND_TONE,
  SDG_LABELS,
  SECTOR_LABEL,
} from '@/lib/library/types';

interface Props {
  item: LibraryItem | null;
  onClose: () => void;
}

export function LibraryDetailDialog({ item, onClose }: Props) {
  if (!item) return null;
  const isWeb = item.format === 'web';

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('text-[11px]', KIND_TONE[item.kind])}>
              {KIND_LABEL[item.kind]}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <FileText className="mr-1 h-3 w-3" />
              {FORMAT_LABEL[item.format]}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {item.year}
            </Badge>
            {item.featured && (
              <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning text-[11px]">
                <Sparkles className="mr-1 h-3 w-3" />
                Pilihan editor
              </Badge>
            )}
            {item.readMinutes && (
              <Badge variant="outline" className="text-[11px]">
                <Clock className="mr-1 h-3 w-3" />
                {item.readMinutes} mnt
              </Badge>
            )}
            {item.status && item.status !== 'ready' && item.status !== 'indexed' && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px]",
                  (item.status === 'processing' || item.status === 'uploaded') && "border-amber-500/30 bg-amber-500/15 text-amber-600 animate-pulse",
                  item.status === 'failed' && "border-destructive/30 bg-destructive/15 text-destructive",
                  item.status === 'partial' && "border-blue-500/30 bg-blue-500/15 text-blue-600"
                )}
              >
                {item.status === 'processing' || item.status === 'uploaded' ? 'Mengindeks...' : item.status === 'failed' ? 'Gagal' : item.status}
              </Badge>
            )}
            {item.consent_status && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px]",
                  item.consent_status === 'written' && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
                  item.consent_status === 'implied' && "border-amber-500/30 bg-amber-500/10 text-amber-600",
                  item.consent_status === 'none' && "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                Izin: {item.consent_status === 'written' ? 'Tertulis' : item.consent_status === 'implied' ? 'Tersirat' : 'Belum Ada'}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl leading-snug">{item.title}</DialogTitle>
          <DialogDescription className="text-sm">{item.source}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm leading-relaxed text-foreground/90">{item.summary}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sektor
              </h4>
              <div className="flex flex-wrap gap-1">
                {item.sectors.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">
                    {SECTOR_LABEL[s]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                SDG terkait
              </h4>
              <div className="flex flex-wrap gap-1">
                {item.sdgs.map((n) => (
                  <Badge key={n} variant="outline" className="text-[11px]" title={SDG_LABELS[n]}>
                    SDG {n}
                  </Badge>
                ))}
              </div>
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="sm:col-span-2">
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tag
                </h4>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[11px]">
                      #{t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={item.url} target="_blank" rel="noreferrer">
                {isWeb ? (
                  <>
                    Buka di sumber
                    <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Unduh {FORMAT_LABEL[item.format]}
                  </>
                )}
              </a>
            </Button>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}