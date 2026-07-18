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
  QuickProgramData,
  QuickWizardData,
} from '@/lib/grant-writer/types';
import { SECTORS, DONOR_STANDARDS } from '@/lib/grant-writer/types';

interface Props {
  data: QuickWizardData;
  onChange: (updater: (prev: QuickWizardData) => QuickWizardData) => void;
}

export function QuickStepProgram({ data, onChange }: Props) {
  const p = (data.program ?? {}) as Partial<QuickProgramData>;
  const update = <K extends keyof QuickProgramData>(
    key: K,
    value: QuickProgramData[K],
  ) =>
    onChange((prev) => ({
      ...prev,
      program: { ...(prev.program ?? {}), [key]: value },
    }));

  return (
    <div className="grid gap-5">
      <div>
        <Label htmlFor="prog-title">Judul program *</Label>
        <Input
          id="prog-title"
          value={p.programTitle ?? ''}
          onChange={(e) => update('programTitle', e.target.value)}
          maxLength={200}
          placeholder="cth. Sekolah Pesisir untuk Anak Nelayan"
          className="mt-1.5"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Sektor utama *</Label>
          <Select value={p.sector ?? ''} onValueChange={(v) => update('sector', v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pilih sektor" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="prog-donor">Donor target *</Label>
          <Input
            id="prog-donor"
            value={p.targetDonor ?? ''}
            onChange={(e) => update('targetDonor', e.target.value)}
            placeholder="cth. Tanoto Foundation, USAID"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Standar donor *</Label>
          <Select value={p.donorStandard ?? ''} onValueChange={(v) => update('donorStandard', v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pilih standar donor" />
            </SelectTrigger>
            <SelectContent>
              {DONOR_STANDARDS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="prog-partners">Mitra mana yang kemungkinan dilibatkan? *</Label>
          <Input
            id="prog-partners"
            value={p.partnersAndActors ?? ''}
            onChange={(e) => update('partnersAndActors', e.target.value)}
            placeholder="cth. Koperasi Desa, Kelompok Tani, Pemda"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="prog-bg">Latar belakang & Urgensi *</Label>
        <Textarea
          id="prog-bg"
          value={p.background ?? ''}
          onChange={(e) => update('background', e.target.value)}
          maxLength={2000}
          placeholder="Konteks sosial, data, dan urgensi program."
          className="mt-1.5 min-h-[120px]"
        />
      </div>

      <div>
        <Label htmlFor="prog-problem">Masalah apa yang paling ingin diselesaikan? *</Label>
        <Textarea
          id="prog-problem"
          value={p.problemStatement ?? ''}
          onChange={(e) => update('problemStatement', e.target.value)}
          maxLength={1500}
          placeholder="Inti masalah dalam 2–4 kalimat."
          className="mt-1.5 min-h-[100px]"
        />
      </div>

      <div>
        <Label htmlFor="prog-sol">Kegiatan utama apa yang sudah dibayangkan? *</Label>
        <Textarea
          id="prog-sol"
          value={p.proposedSolution ?? ''}
          onChange={(e) => update('proposedSolution', e.target.value)}
          maxLength={2000}
          placeholder="Pendekatan utama, aktivitas inti, dan model program."
          className="mt-1.5 min-h-[120px]"
        />
      </div>

      <div>
        <Label htmlFor="prog-out">Perubahan apa yang ingin terlihat setelah program selesai? *</Label>
        <Textarea
          id="prog-out"
          value={p.expectedOutcomes ?? ''}
          onChange={(e) => update('expectedOutcomes', e.target.value)}
          maxLength={1500}
          placeholder="Perubahan konkret yang akan terjadi pada penerima manfaat."
          className="mt-1.5 min-h-[100px]"
        />
      </div>
    </div>
  );
}