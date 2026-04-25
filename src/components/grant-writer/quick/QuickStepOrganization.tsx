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
import type {
  QuickOrganizationData,
  QuickWizardData,
} from '@/lib/grant-writer/types';
import { ORG_TYPES } from '@/lib/grant-writer/types';

interface Props {
  data: QuickWizardData;
  onChange: (updater: (prev: QuickWizardData) => QuickWizardData) => void;
}

export function QuickStepOrganization({ data, onChange }: Props) {
  const o = (data.organization ?? {}) as Partial<QuickOrganizationData>;
  const update = <K extends keyof QuickOrganizationData>(
    key: K,
    value: QuickOrganizationData[K],
  ) =>
    onChange((prev) => ({
      ...prev,
      organization: { ...(prev.organization ?? {}), [key]: value },
    }));

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="org-name">Nama organisasi *</Label>
          <Input
            id="org-name"
            value={o.orgName ?? ''}
            onChange={(e) => update('orgName', e.target.value)}
            maxLength={200}
            placeholder="cth. Yayasan Cahaya Pesisir"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Jenis organisasi *</Label>
          <Select
            value={o.orgType ?? ''}
            onValueChange={(v) => update('orgType', v as QuickOrganizationData['orgType'])}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="org-year">Tahun berdiri</Label>
          <Input
            id="org-year"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            value={o.yearFounded ?? ''}
            onChange={(e) => update('yearFounded', Number(e.target.value) || 0)}
            placeholder="cth. 2015"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="org-web">Website / media sosial</Label>
          <Input
            id="org-web"
            value={o.website ?? ''}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://…"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="org-cp">Kontak person *</Label>
          <Input
            id="org-cp"
            value={o.contactPerson ?? ''}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Nama lengkap"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="org-mail">Email kontak *</Label>
          <Input
            id="org-mail"
            type="email"
            value={o.contactEmail ?? ''}
            onChange={(e) => update('contactEmail', e.target.value)}
            placeholder="kontak@organisasi.org"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="org-profile">Profil singkat organisasi *</Label>
        <Textarea
          id="org-profile"
          value={o.orgProfile ?? ''}
          onChange={(e) => update('orgProfile', e.target.value)}
          maxLength={2000}
          placeholder="Misi, fokus kerja, capaian utama, area dampingan…"
          className="mt-1.5 min-h-[140px]"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          1–3 paragraf. Sebut misi, fokus kerja, dan capaian terbesar.
        </p>
      </div>
    </div>
  );
}