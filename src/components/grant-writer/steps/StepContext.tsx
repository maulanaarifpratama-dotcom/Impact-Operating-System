import { useEffect, useState } from 'react';
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
import type { ContextData, WizardData } from '@/lib/grant-writer/types';
import { DONOR_STANDARDS, SECTORS } from '@/lib/grant-writer/types';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

export function StepContext({ data, onChange }: Props) {
  const c = (data.context ?? {}) as Partial<ContextData>;
  const update = <K extends keyof ContextData>(key: K, value: ContextData[K]) =>
    onChange((prev) => ({ ...prev, context: { ...(prev.context ?? {}), [key]: value } }));

  return (
    <div className="grid gap-5">
      <div>
        <Label htmlFor="title">Judul proyek yang diusulkan *</Label>
        <Input
          id="title"
          value={c.proposedTitle ?? ''}
          onChange={(e) => update('proposedTitle', e.target.value)}
          maxLength={200}
          placeholder="cth. Sekolah Pesisir untuk Anak Nelayan di NTT"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="problem">Pernyataan masalah singkat *</Label>
        <Textarea
          id="problem"
          value={c.problemStatement ?? ''}
          onChange={(e) => update('problemStatement', e.target.value)}
          maxLength={1000}
          placeholder="Apa masalah utama yang ingin diatasi? (1-3 kalimat)"
          className="mt-1.5 min-h-[90px]"
        />
      </div>

      <div>
        <Label htmlFor="background">Latar belakang & konteks</Label>
        <Textarea
          id="background"
          value={c.background ?? ''}
          onChange={(e) => update('background', e.target.value)}
          maxLength={3000}
          placeholder="Konteks sosial, data terkini, urgensi intervensi…"
          className="mt-1.5 min-h-[120px]"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="donor">Donor target</Label>
          <Input
            id="donor"
            value={c.targetDonor ?? ''}
            onChange={(e) => update('targetDonor', e.target.value)}
            maxLength={200}
            placeholder="cth. Tanoto Foundation, USAID, EU"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Standar donor</Label>
          <Select
            value={c.donorStandard ?? 'un_oecd_dac'}
            onValueChange={(v) => update('donorStandard', v as ContextData['donorStandard'])}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DONOR_STANDARDS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label} — <span className="text-muted-foreground">{d.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Sektor</Label>
          <Select value={c.sector ?? ''} onValueChange={(v) => update('sector', v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pilih sektor utama" />
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
          <Label htmlFor="geo">Wilayah / geografi</Label>
          <Input
            id="geo"
            value={c.geography ?? ''}
            onChange={(e) => update('geography', e.target.value)}
            maxLength={200}
            placeholder="cth. Kabupaten Sumba Timur, NTT"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="dur">Durasi (bulan)</Label>
          <Input
            id="dur"
            type="number"
            min={1}
            max={120}
            value={c.durationMonths ?? ''}
            onChange={(e) => update('durationMonths', Number(e.target.value) || 0)}
            className="mt-1.5"
          />
        </div>
        <BudgetField
          value={c.budgetIdr ?? 0}
          onChange={(v) => update('budgetIdr', v)}
        />
      </div>
    </div>
  );
}

function BudgetField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value ? value.toString() : '');
  useEffect(() => {
    setText(value ? value.toString() : '');
  }, [value]);
  const formatted = value
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
    : '';
  return (
    <div>
      <Label htmlFor="budget">Anggaran (IDR)</Label>
      <Input
        id="budget"
        type="number"
        min={0}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(Number(e.target.value) || 0);
        }}
        placeholder="cth. 500000000"
        className="mt-1.5"
      />
      {formatted && <p className="mt-1 text-xs text-muted-foreground">{formatted}</p>}
    </div>
  );
}