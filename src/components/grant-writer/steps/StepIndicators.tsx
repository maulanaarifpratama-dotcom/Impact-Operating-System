import { Plus, Trash2 } from 'lucide-react';
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
import type { IndicatorItem, WizardData } from '@/lib/grant-writer/types';
import { makeId } from './StepStakeholders';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

export function StepIndicators({ data, onChange }: Props) {
  const indicators: IndicatorItem[] = data.indicators ?? [];
  const outcomes = data.objectives?.outcomes ?? [];
  const outputs = data.objectives?.outputs ?? [];

  const update = (next: IndicatorItem[]) => onChange((p) => ({ ...p, indicators: next }));

  const add = () =>
    update([
      ...indicators,
      {
        id: makeId(),
        level: 'goal',
        refId: undefined,
        indicator: '',
        baseline: '',
        target: '',
        meansOfVerification: '',
      },
    ]);

  const patch = (id: string, p: Partial<IndicatorItem>) =>
    update(indicators.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const remove = (id: string) => update(indicators.filter((i) => i.id !== id));

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Tetapkan <strong>OVI</strong> (Objectively Verifiable Indicators) dan{' '}
        <strong>Means of Verification</strong> untuk setiap level.
      </p>

      {indicators.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada indikator. Tambahkan minimal 1 indikator per level.
        </div>
      )}

      {indicators.map((ind) => {
        const refOptions =
          ind.level === 'outcome' ? outcomes : ind.level === 'output' ? outputs : [];
        return (
          <div key={ind.id} className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Level</Label>
                <Select
                  value={ind.level}
                  onValueChange={(v) =>
                    patch(ind.id, { level: v as IndicatorItem['level'], refId: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goal">Goal (Impact)</SelectItem>
                    <SelectItem value="outcome">Outcome</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ind.level !== 'goal' && (
                <div>
                  <Label>Mengacu pada</Label>
                  <Select
                    value={ind.refId ?? ''}
                    onValueChange={(v) => patch(ind.id, { refId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {refOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.text || '(belum diberi nama)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Indikator (OVI)</Label>
                <Input
                  value={ind.indicator}
                  onChange={(e) => patch(ind.id, { indicator: e.target.value })}
                  placeholder="Mis. % siswa yang lulus uji literasi"
                />
              </div>
              <div>
                <Label>Baseline</Label>
                <Input
                  value={ind.baseline}
                  onChange={(e) => patch(ind.id, { baseline: e.target.value })}
                  placeholder="Mis. 35%"
                />
              </div>
              <div>
                <Label>Target</Label>
                <Input
                  value={ind.target}
                  onChange={(e) => patch(ind.id, { target: e.target.value })}
                  placeholder="Mis. 75% pada akhir Tahun 2"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Means of Verification</Label>
                <Input
                  value={ind.meansOfVerification}
                  onChange={(e) => patch(ind.id, { meansOfVerification: e.target.value })}
                  placeholder="Mis. Laporan asesmen sekolah, survei pre-post"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => remove(ind.id)}>
                <Trash2 className="mr-1 h-4 w-4" /> Hapus
              </Button>
            </div>
          </div>
        );
      })}

      <Button variant="outline" onClick={add} className="w-fit">
        <Plus className="mr-1 h-4 w-4" /> Tambah indikator
      </Button>
    </div>
  );
}