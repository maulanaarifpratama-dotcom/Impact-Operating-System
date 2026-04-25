import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { AdBrief, AdPlatform, AdVariant } from '@/lib/ads/types';
import { PLATFORM_LIMITS } from '@/lib/ads/types';
import { buildVariant } from '@/lib/ads/generator';

interface Props {
  variant: AdVariant;
  index: number;
  platform: AdPlatform;
  /** Brief untuk regenerate per varian. Jika null, tombol regenerate disembunyikan. */
  brief?: AdBrief;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={
        'text-[10px] font-medium ' + (over ? 'text-destructive' : 'text-muted-foreground')
      }
    >
      {value.length}/{max}
    </span>
  );
}

export function AdVariantCard({ variant, index, platform, brief }: Props) {
  const [copied, setCopied] = useState(false);
  const [current, setCurrent] = useState<AdVariant>(variant);
  // local seed offset; bumped on each regenerate so output keeps changing
  const [seedOffset, setSeedOffset] = useState(0);
  const limits = PLATFORM_LIMITS[platform];

  // sync when parent regenerates everything (new variant prop)
  useEffect(() => {
    setCurrent(variant);
    setSeedOffset(0);
  }, [variant]);

  const fullText = [
    current.headline,
    '',
    current.body,
    '',
    `→ ${current.cta}`,
    current.hashtags?.length ? '\n' + current.hashtags.join(' ') : '',
  ]
    .filter(Boolean)
    .join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ title: 'Tersalin', description: `Varian ${index + 1} siap ditempel.` });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Gagal menyalin', variant: 'destructive' });
    }
  };

  const regenerate = () => {
    if (!brief) return;
    const nextSeed = seedOffset + 1;
    setSeedOffset(nextSeed);
    // step seed by 7 to escape the original 0/1/2 cycle
    setCurrent(buildVariant(brief, platform, index + nextSeed * 7, index));
  };

  return (
    <Card className="flex h-full flex-col gap-3 p-5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
          Varian {index + 1}
        </Badge>
        <div className="flex items-center gap-1">
          {brief && (
            <Button
              size="sm"
              variant="ghost"
              onClick={regenerate}
              className="h-8 gap-1.5 text-xs"
              title="Regenerate varian ini"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={copy} className="h-8 gap-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Tersalin' : 'Salin'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Headline</Label>
          <CharCount value={current.headline} max={limits.headline} />
        </div>
        <p className="text-base font-semibold leading-snug">{current.headline}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Body</Label>
          <CharCount value={current.body} max={limits.body} />
        </div>
        <p className="text-sm text-muted-foreground">{current.body}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>CTA</Label>
          <CharCount value={current.cta} max={limits.cta} />
        </div>
        <p className="text-sm font-medium text-accent">→ {current.cta}</p>
      </div>

      {current.hashtags && current.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {current.hashtags.map((h) => (
            <Badge key={h} variant="secondary" className="text-[10px] font-normal">
              {h}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}