import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  QuickOrganizationData,
  QuickWizardData,
  QuickOrgType,
} from '@/lib/grant-writer/types';
import { ORG_TYPES, SDG_GOALS } from '@/lib/grant-writer/types';

interface Props {
  data: QuickWizardData;
  onChange: (updater: (prev: QuickWizardData) => QuickWizardData) => void;
}

export function QuickStepOrganization({ data, onChange }: Props) {
  const o = (data.organization ?? {}) as Partial<QuickOrganizationData>;
  const sdgs = o.sdgFocus ?? [];
  const currentYear = new Date().getFullYear();

  const update = <K extends keyof QuickOrganizationData>(
    key: K,
    value: QuickOrganizationData[K],
  ) =>
    onChange((prev) => ({
      ...prev,
      organization: { ...(prev.organization ?? {}), [key]: value },
    }));

  const toggleSdg = (num: number) => {
    const next = sdgs.includes(num)
      ? sdgs.filter((n) => n !== num)
      : [...sdgs, num].sort((a, b) => a - b);
    update('sdgFocus', next);
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="org-name">Nama organisasi *</Label>
          <Input
            id="org-name"
            value={o.orgName ?? ''}
            onChange={(e) => update('orgName', e.target.value.slice(0, 200))}
            maxLength={200}
            placeholder="cth. Yayasan Cahaya Pesisir"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Jenis organisasi *</Label>
          <Select
            value={o.orgType ?? ''}
            onValueChange={(v) => update('orgType', v as QuickOrgType)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pilih jenis" />
            </SelectTrigger>
            <SelectContent>
              {ORG_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="org-year">Tahun berdiri</Label>
        <Input
          id="org-year"
          type="number"
          min={1900}
          max={currentYear}
          value={o.yearFounded ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!n) return update('yearFounded', undefined as never);
            if (n < 1900 || n > currentYear) return;
            update('yearFounded', n);
          }}
          placeholder="cth. 2015"
          className="mt-1.5 max-w-[200px]"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Antara 1900 dan {currentYear}.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <Label>Fokus SDGs *</Label>
          <Badge variant="secondary" className="text-xs">
            {sdgs.length} dipilih
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pilih satu atau lebih Sustainable Development Goals yang relevan dengan kerja
          organisasi Anda.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SDG_GOALS.map((g) => {
            const active = sdgs.includes(g.num);
            return (
              <button
                key={g.num}
                type="button"
                onClick={() => toggleSdg(g.num)}
                aria-pressed={active}
                className={cn(
                  'group relative flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all',
                  active
                    ? 'border-transparent shadow-sm ring-2 ring-offset-1 ring-offset-background'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                )}
                style={
                  active
                    ? { ['--sdg-color' as never]: g.color, boxShadow: `0 0 0 2px ${g.color}` }
                    : undefined
                }
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                  style={{ backgroundColor: g.color }}
                >
                  {g.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    SDG {g.num}
                  </span>
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                    {g.title}
                  </span>
                </span>
                {active && (
                  <Check
                    className="absolute right-1.5 top-1.5 h-3.5 w-3.5"
                    style={{ color: g.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
