import { useState } from 'react';
import { Megaphone, Sparkles, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  type AdBrief,
  type AdObjective,
  type AdPlatform,
  type AdTone,
  OBJECTIVE_LABEL,
  PLATFORM_DESC,
  PLATFORM_LABEL,
  TONE_DESC,
  TONE_LABEL,
} from '@/lib/ads/types';
import { generateAdVariants, type PlatformResult } from '@/lib/ads/generator';
import { AdVariantCard } from '@/components/ads/AdVariantCard';

const PLATFORMS: AdPlatform[] = ['meta', 'google', 'tiktok'];
const OBJECTIVES: AdObjective[] = [
  'donasi',
  'awareness',
  'recruit_relawan',
  'event_signup',
  'sales_umkm',
];
const TONES: AdTone[] = ['emosional', 'profesional', 'casual'];

const SAMPLE_BRIEF: AdBrief = {
  campaign: 'Sekolah Adat Sokola',
  message:
    'Pendidikan dasar adaptif untuk anak-anak komunitas adat di pedalaman Indonesia.',
  audience: 'donatur individu usia 25-45',
  region: 'Jakarta & Surabaya',
  objective: 'donasi',
  tone: 'emosional',
  platforms: ['meta', 'tiktok'],
};

export default function ImpactoryAds() {
  const [brief, setBrief] = useState<AdBrief>({
    campaign: '',
    message: '',
    audience: '',
    region: '',
    objective: 'donasi',
    tone: 'emosional',
    platforms: ['meta'],
  });
  const [results, setResults] = useState<PlatformResult[] | null>(null);

  const update = <K extends keyof AdBrief>(key: K, value: AdBrief[K]) =>
    setBrief((p) => ({ ...p, [key]: value }));

  const togglePlatform = (p: AdPlatform) =>
    setBrief((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));

  const canGenerate =
    brief.campaign.trim() &&
    brief.message.trim() &&
    brief.audience.trim() &&
    brief.platforms.length > 0;

  const onGenerate = () => {
    if (!canGenerate) return;
    setResults(generateAdVariants(brief));
  };

  const onLoadSample = () => {
    setBrief(SAMPLE_BRIEF);
    setResults(generateAdVariants(SAMPLE_BRIEF));
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
              Buat varian copy siap pakai untuk Meta, Google, dan TikTok — dirancang untuk kampanye
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
                Isi minimal kampanye, pesan utama, audiens, dan pilih platform.
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

            {/* Platform: toggle buttons multi-select */}
            <div className="space-y-2">
              <Label>
                Platform <span className="text-destructive">*</span>
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  (bisa pilih lebih dari satu)
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const active = brief.platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-lg border-2 px-3 py-2.5 text-xs font-semibold transition-all',
                        active
                          ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                          : 'border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5',
                      )}
                    >
                      {PLATFORM_LABEL[p].split(' ')[0]}
                    </button>
                  );
                })}
              </div>
              {brief.platforms.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {brief.platforms.map((p) => PLATFORM_DESC[p]).join(' · ')}
                </p>
              )}
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
              <Label htmlFor="message">
                Pesan utama <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                value={brief.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Inti pesan: apa yang ditawarkan / masalah yang diselesaikan?"
                rows={3}
              />
            </div>

            {/* Tone: radio 3 opsi */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <RadioGroup
                value={brief.tone}
                onValueChange={(v) => update('tone', v as AdTone)}
                className="grid gap-2"
              >
                {TONES.map((t) => {
                  const active = brief.tone === t;
                  return (
                    <label
                      key={t}
                      htmlFor={`tone-${t}`}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all',
                        active
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-accent/40 hover:bg-muted/40',
                      )}
                    >
                      <RadioGroupItem id={`tone-${t}`} value={t} className="mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-semibold">{TONE_LABEL[t]}</p>
                        <p className="text-[11px] text-muted-foreground">{TONE_DESC[t]}</p>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            <Button
              onClick={onGenerate}
              disabled={!canGenerate}
              size="lg"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Ad Copy
            </Button>
          </Card>
        </aside>

        {/* Output */}
        <div className="space-y-6">
          {!results ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center shadow-card">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Megaphone className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Belum ada varian</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Isi brief di kiri lalu klik <strong>Generate Ad Copy</strong>, atau muat contoh
                  untuk lihat hasilnya.
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
                  <strong className="text-foreground">{results.length}</strong> platform ·{' '}
                  <strong className="text-foreground">{results.length * 3}</strong> varian · tone{' '}
                  {TONE_LABEL[brief.tone]} · {OBJECTIVE_LABEL[brief.objective]}
                </p>
                <Button size="sm" variant="ghost" onClick={onGenerate} className="text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>

              {results.map((res) => (
                <section key={res.platform} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30">
                      {PLATFORM_LABEL[res.platform]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {PLATFORM_DESC[res.platform]}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {res.variants.map((v, i) => (
                      <AdVariantCard
                        key={v.id}
                        variant={v}
                        index={i}
                        platform={res.platform}
                        brief={brief}
                      />
                    ))}
                  </div>
                </section>
              ))}

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
