import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  type GrantSector,
  type OrgProfile,
  type OrgStage,
  REGIONS,
  SDG_LABELS,
  SECTOR_LABEL,
  STAGE_LABEL,
} from '@/lib/grantfinder/types';
import { useOrgProfile } from '@/lib/grantfinder/storage';
import { Trash2, Sparkles } from 'lucide-react';

const SECTORS = Object.entries(SECTOR_LABEL) as [GrantSector, string][];
const STAGES = Object.entries(STAGE_LABEL) as [OrgStage, string][];
const SDGS = Object.entries(SDG_LABELS).map(([n, l]) => ({ n: Number(n), l }));

export function OrgProfileForm() {
  const { profile, save, clear } = useOrgProfile();
  const { toast } = useToast();
  const [draft, setDraft] = useState<OrgProfile>(
    profile ?? { name: '', stage: 'rintisan', sectors: [], sdgs: [], region: 'nasional' },
  );

  const toggleSector = (s: GrantSector) =>
    setDraft((d) => ({
      ...d,
      sectors: d.sectors.includes(s) ? d.sectors.filter((x) => x !== s) : [...d.sectors, s],
    }));

  const toggleSdg = (n: number) =>
    setDraft((d) => ({
      ...d,
      sdgs: d.sdgs.includes(n) ? d.sdgs.filter((x) => x !== n) : [...d.sdgs, n],
    }));

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast({ title: 'Nama organisasi wajib diisi', variant: 'destructive' });
      return;
    }
    if (draft.sectors.length === 0) {
      toast({ title: 'Pilih minimal 1 sektor', variant: 'destructive' });
      return;
    }
    save(draft);
    toast({ title: 'Profil disimpan', description: 'Skor kecocokan akan diperbarui di seluruh katalog.' });
  };

  const handleClear = () => {
    clear();
    setDraft({ name: '', stage: 'rintisan', sectors: [], sdgs: [], region: 'nasional' });
    toast({ title: 'Profil dihapus' });
  };

  return (
    <Card className="space-y-6 p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-semibold">Profil organisasi Anda</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Isi profil agar Grantfinder bisa menghitung skor kecocokan untuk setiap hibah.
          </p>
        </div>
        {profile && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Nama organisasi</Label>
          <Input
            id="org-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Yayasan Maju Bersama"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tahap organisasi</Label>
          <Select value={draft.stage} onValueChange={(v) => setDraft({ ...draft, stage: v as OrgStage })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Wilayah utama kerja</Label>
          <Select value={draft.region} onValueChange={(v) => setDraft({ ...draft, region: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sektor fokus (pilih beberapa)</Label>
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.map(([v, l]) => {
            const active = draft.sectors.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleSector(v)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>SDG yang difokuskan (pilih beberapa)</Label>
        <div className="flex flex-wrap gap-1.5">
          {SDGS.map(({ n, l }) => {
            const active = draft.sdgs.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleSdg(n)}
                title={l}
                className={cn(
                  'inline-flex h-8 min-w-[36px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Simpan profil
        </Button>
      </div>
    </Card>
  );
}