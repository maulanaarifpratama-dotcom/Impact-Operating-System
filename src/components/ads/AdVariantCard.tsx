import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { AdPlatform, AdVariant } from '@/lib/ads/types';
import { PLATFORM_LIMITS } from '@/lib/ads/types';

interface Props {
  variant: AdVariant;
  index: number;
  platform: AdPlatform;
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

export function AdVariantCard({ variant, index, platform }: Props) {
  const [copied, setCopied] = useState(false);
  const limits = PLATFORM_LIMITS[platform];

  const fullText = [
    variant.headline,
    '',
    variant.body,
    '',
    `→ ${variant.cta}`,
    variant.hashtags?.length ? '\n' + variant.hashtags.join(' ') : '',
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

  return (
    <Card className="flex h-full flex-col gap-3 p-5 shadow-card transition-all hover:border-accent/40 hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
          Varian {index + 1}
        </Badge>
        <Button size="sm" variant="ghost" onClick={copy} className="h-8 gap-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Tersalin' : 'Salin'}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Headline</Label>
          <CharCount value={variant.headline} max={limits.headline} />
        </div>
        <p className="text-base font-semibold leading-snug">{variant.headline}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Body</Label>
          <CharCount value={variant.body} max={limits.body} />
        </div>
        <p className="text-sm text-muted-foreground">{variant.body}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>CTA</Label>
          <CharCount value={variant.cta} max={limits.cta} />
        </div>
        <p className="text-sm font-medium text-accent">→ {variant.cta}</p>
      </div>

      {variant.hashtags && variant.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {variant.hashtags.map((h) => (
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