import { ArrowUpRight, Clock, FileText, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type LibraryItem,
  FORMAT_LABEL,
  KIND_LABEL,
  KIND_TONE,
  SECTOR_LABEL,
} from '@/lib/library/types';

interface LibraryCardProps {
  item: LibraryItem;
  onOpen: () => void;
}

export function LibraryCard({ item, onOpen }: LibraryCardProps) {
  return (
    <Card className="group flex h-full flex-col gap-3 overflow-hidden p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[11px]', KIND_TONE[item.kind])}>
            {KIND_LABEL[item.kind]}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            <FileText className="mr-1 h-3 w-3" />
            {FORMAT_LABEL[item.format]}
          </Badge>
          {item.featured && (
            <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning text-[11px]">
              <Sparkles className="mr-1 h-3 w-3" />
              Pilihan editor
            </Badge>
          )}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{item.year}</span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="text-left text-base font-semibold leading-snug hover:text-accent focus:outline-none"
      >
        {item.title}
      </button>

      <p className="text-xs text-muted-foreground">
        {item.source}
        {item.readMinutes && (
          <>
            {' · '}
            <Clock className="-mt-0.5 mr-0.5 inline h-3 w-3" />
            {item.readMinutes} mnt
          </>
        )}
      </p>

      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{item.summary}</p>

      <div className="flex flex-wrap gap-1">
        {item.sectors.slice(0, 3).map((s) => (
          <Badge key={s} variant="secondary" className="text-[10px] font-normal">
            {SECTOR_LABEL[s]}
          </Badge>
        ))}
        {item.sdgs.slice(0, 4).map((n) => (
          <span
            key={`sdg-${n}`}
            className="inline-flex h-5 min-w-[22px] items-center justify-center rounded bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground"
            title={`SDG ${n}`}
          >
            {n}
          </span>
        ))}
      </div>

      <Button onClick={onOpen} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
        Buka
        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </Card>
  );
}