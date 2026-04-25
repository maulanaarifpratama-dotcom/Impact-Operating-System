import { useState } from 'react';
import { Megaphone, Sparkles, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type AdBrief,
  type AdObjective,
  type AdPlatform,
  type AdTone,
  type AdVariant,
  OBJECTIVE_LABEL,
  PLATFORM_DESC,
  PLATFORM_LABEL,
  TONE_LABEL,
} from '@/lib/ads/types';
import { generateAdVariants } from '@/lib/ads/generator';
import { AdVariantCard } from '@/components/ads/AdVariantCard';

const PLATFORMS: AdPlatform[] = ['meta', 'google', 'tiktok'];
const OBJECTIVES: AdObjective[] = [
  'donasi',
  'awareness',
  'recruit_relawan',
  'event_signup',
  'sales_umkm',
];
const TONES: AdTone[] = ['urgent', 'inspiratif', 'hangat', 'formal', 'percakapan'];

const SAMPLE_BRIEF: AdBrief = {
  campaign: 'Sekolah Adat Sokola',
  description:
    'Pendidikan dasar adaptif untuk anak-anak komunitas adat di pedalaman Indonesia.',
  audience: 'donatur individu usia 25-45',
  region: 'Jakarta & Surabaya',
  objective: 'donasi',
  tone: 'inspiratif',
  platform: 'meta',
};

export default function ImpactoryAds() {
  const [brief, setBrief] = useState<AdBrief>({
    campaign: '',
    description: '',
    audience: '',
    region: '',
    objective: 'donasi',
    tone: 'inspiratif',
    platform: 'meta',
  });
  const [variants, setVariants] = useState<AdVariant[] | null>(null);

  const update = <K extends keyof AdBrief>(key: K, value: AdBrief[K]) =>
    setBrief((p) => ({ ...p, [key]: value }));

  const canGenerate = brief.campaign.trim() && brief.description.trim() && brief.audience.trim();

  const onGenerate = () => {
    if (!canGenerate) return;
    setVariants(generateAdVariants(brief));
  };

  const onLoadSample = () => {
    setBrief(SAMPLE_BRIEF);
    setVariants(generateAdVariants(SAMPLE_BRIEF));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elegant md:h-14 md:w-14">
            <Megaphone className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="flex-1 space-y-1">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
              <Sparkles className="mr-1 h-3 w-3" />
              MVP — Generator copy iklan
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Ads</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Buat 3 varian copy siap pakai untuk Meta, Google, dan TikTok — dirancang untuk kampanye
              fundraising, advokasi, dan UMKM sosial.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onLoadSample} className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Coba contoh
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Brief form */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="space-y-5 p-5 shadow-card md:p-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Brief kampanye</h2>
              <p className="text-xs text-muted-foreground">
                Isi minimal kampanye, deskripsi, dan audiens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign">
                Kampanye / Program <span className="text-destructive">*</span>
              </Label>
              <Input
                id="campaign"
                value={brief.campaign}
                onChange={(e) => update('campaign', e.target.value)}
                placeholder="Mis. Sekolah Adat Sokola"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Deskripsi singkat <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={brief.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Apa yang ditawarkan / masalah yang diselesaikan?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">
                Target audiens <span className="text-destructive">*</span>
              </Label>
              <Input
                id="audience"
                value={brief.audience}
                onChange={(e) => update('audience', e.target.value)}
                placeholder="Mis. donatur individu usia 25-45"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Lokasi (opsional)</Label>
              <Input
                id="region"
                value={brief.region ?? ''}
                onChange={(e) => update('region', e.target.value)}
                placeholder="Mis. Jakarta & Surabaya"
              />
            </div>

            <div className="space-y-2">
              <Label>Tujuan</Label>
              <Select
                value={brief.objective}
                onValueChange={(v) => update('objective', v as AdObjective)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {OBJECTIVE_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={brief.tone} onValueChange={(v) => update('tone', v as AdTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TONE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Tabs
                value={brief.platform}
                onValueChange={(v) => update('platform', v as AdPlatform)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  {PLATFORMS.map((p) => (
                    <TabsTrigger key={p} value={p} className="text-xs">
                      {PLATFORM_LABEL[p].split(' ')[0]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-[11px] text-muted-foreground">{PLATFORM_DESC[brief.platform]}</p>
            </div>

            <Button
              onClick={onGenerate}
              disabled={!canGenerate}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Buat 3 varian
            </Button>
          </Card>
        </aside>

        {/* Output */}
        <div className="space-y-4">
          {!variants ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center shadow-card">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Megaphone className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Belum ada varian</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Isi brief di kiri lalu klik <strong>Buat 3 varian</strong>, atau muat contoh di
                  hero untuk lihat hasilnya.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onLoadSample} className="gap-1.5">
                <Wand2 className="h-3.5 w-3.5" />
                Coba contoh
              </Button>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  3 varian untuk{' '}
                  <strong className="text-foreground">{PLATFORM_LABEL[brief.platform]}</strong> ·
                  tone {TONE_LABEL[brief.tone]} · {OBJECTIVE_LABEL[brief.objective]}
                </p>
                <Button size="sm" variant="ghost" onClick={onGenerate} className="text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {variants.map((v, i) => (
                  <AdVariantCard key={v.id} variant={v} index={i} platform={brief.platform} />
                ))}
              </div>
              <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                MVP demo — copy dihasilkan dari template deterministik. Integrasi LLM (Lovable AI
                Gateway) akan menyusul untuk variasi yang lebih kreatif.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}