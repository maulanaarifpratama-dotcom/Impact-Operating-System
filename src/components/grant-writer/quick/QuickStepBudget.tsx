import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  QuickBudgetData,
  QuickWizardData,
} from '@/lib/grant-writer/types';

interface Props {
  data: QuickWizardData;
  onChange: (updater: (prev: QuickWizardData) => QuickWizardData) => void;
}

export function QuickStepBudget({ data, onChange }: Props) {
  const b = (data.budget ?? {}) as Partial<QuickBudgetData>;
  const update = <K extends keyof QuickBudgetData>(
    key: K,
    value: QuickBudgetData[K],
  ) =>
    onChange((prev) => ({
      ...prev,
      budget: { ...(prev.budget ?? {}), [key]: value },
    }));

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="ben-count">Jumlah penerima manfaat *</Label>
          <Input
            id="ben-count"
            type="number"
            min={0}
            value={b.beneficiaryCount ?? ''}
            onChange={(e) => update('beneficiaryCount', Number(e.target.value) || 0)}
            placeholder="cth. 250"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="geo">Lokasi / wilayah *</Label>
          <Input
            id="geo"
            value={b.geography ?? ''}
            onChange={(e) => update('geography', e.target.value)}
            placeholder="cth. Kabupaten Sumba Timur, NTT"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ben-desc">Profil penerima manfaat *</Label>
        <Textarea
          id="ben-desc"
          value={b.beneficiaryDescription ?? ''}
          onChange={(e) => update('beneficiaryDescription', e.target.value)}
          maxLength={1500}
          placeholder="Siapa mereka? Usia, gender, kondisi sosial-ekonomi…"
          className="mt-1.5 min-h-[100px]"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="dur">Durasi program (bulan) *</Label>
          <Input
            id="dur"
            type="number"
            min={1}
            max={120}
            value={b.durationMonths ?? ''}
            onChange={(e) => update('durationMonths', Number(e.target.value) || 0)}
            placeholder="cth. 12"
            className="mt-1.5"
          />
        </div>
        <BudgetField
          value={b.budgetIdr ?? 0}
          onChange={(v) => update('budgetIdr', v)}
        />
      </div>

      <div>
        <Label htmlFor="break">Rincian anggaran (ringkas)</Label>
        <Textarea
          id="break"
          value={b.budgetBreakdown ?? ''}
          onChange={(e) => update('budgetBreakdown', e.target.value)}
          maxLength={2000}
          placeholder={'cth.\n- SDM & Honor: 40%\n- Operasional lapangan: 30%\n- Logistik & material: 20%\n- M&E + admin: 10%'}
          className="mt-1.5 min-h-[140px] font-mono text-sm"
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
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value)
    : '';
  return (
    <div>
      <Label htmlFor="budget">Anggaran total (IDR) *</Label>
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