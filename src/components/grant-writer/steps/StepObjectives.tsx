import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ObjectiveItem, ObjectivesData, WizardData } from '@/lib/grant-writer/types';
import { makeId } from './StepStakeholders';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

export function StepObjectives({ data, onChange }: Props) {
  const o = (data.objectives ?? {}) as Partial<ObjectivesData>;
  const update = <K extends keyof ObjectivesData>(key: K, value: ObjectivesData[K]) =>
    onChange((prev) => ({ ...prev, objectives: { ...(prev.objectives ?? {}), [key]: value } }));

  const outcomes: ObjectiveItem[] = o.outcomes ?? [];
  const outputs: ObjectiveItem[] = o.outputs ?? [];

  const addOutcome = () => update('outcomes', [...outcomes, { id: makeId(), text: '' }]);
  const addOutput = () => update('outputs', [...outputs, { id: makeId(), text: '' }]);
  const patchOutcome = (id: string, text: string) =>
    update('outcomes', outcomes.map((i) => (i.id === id ? { ...i, text } : i)));
  const patchOutput = (id: string, text: string) =>
    update('outputs', outputs.map((i) => (i.id === id ? { ...i, text } : i)));
  const removeOutcome = (id: string) => update('outcomes', outcomes.filter((i) => i.id !== id));
  const removeOutput = (id: string) => update('outputs', outputs.filter((i) => i.id !== id));

  return (
    <div className="space-y-6">
      <section>
        <Label className="text-sm font-semibold">Goal / Impact (jangka panjang) *</Label>
        <p className="text-xs text-muted-foreground">Perubahan besar yang ingin dicapai. Hanya satu kalimat.</p>
        <Textarea value={o.goal ?? ''} onChange={(e) => update('goal', e.target.value)} maxLength={500} placeholder="cth. Meningkatkan kualitas hidup anak nelayan melalui akses pendidikan berkelanjutan." className="mt-2" />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Outcomes (hasil antara) *</Label>
            <p className="text-xs text-muted-foreground">Perubahan perilaku/kondisi. Idealnya 1-3 outcome.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addOutcome}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah</Button>
        </div>
        <div className="mt-2 space-y-2">
          {outcomes.length === 0 && <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada outcome.</p>}
          {outcomes.map((it, i) => (
            <div key={it.id} className="flex items-start gap-2">
              <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{i + 1}</span>
              <Input value={it.text} onChange={(e) => patchOutcome(it.id, e.target.value)} maxLength={300} placeholder="cth. 80% anak yang dijangkau melanjutkan ke jenjang SMP." />
              <Button variant="ghost" size="icon" onClick={() => removeOutcome(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Outputs (deliverables) *</Label>
            <p className="text-xs text-muted-foreground">Produk/jasa konkret. Idealnya 3-8 output.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addOutput}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah</Button>
        </div>
        <div className="mt-2 space-y-2">
          {outputs.length === 0 && <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada output.</p>}
          {outputs.map((it, i) => (
            <div key={it.id} className="flex items-start gap-2">
              <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
              <Input value={it.text} onChange={(e) => patchOutput(it.id, e.target.value)} maxLength={300} placeholder="cth. 200 anak menerima beasiswa pendidikan dasar." />
              <Button variant="ghost" size="icon" onClick={() => removeOutput(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}