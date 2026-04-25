import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActivityItem, WizardData } from '@/lib/grant-writer/types';
import { makeId } from './StepStakeholders';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

export function StepActivities({ data, onChange }: Props) {
  const outputs = data.objectives?.outputs ?? [];
  const activities: ActivityItem[] = data.activities ?? [];
  const update = (next: ActivityItem[]) => onChange((p) => ({ ...p, activities: next }));

  if (outputs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tambahkan dulu <strong>outputs</strong> di langkah 4 sebelum merinci aktivitas.
      </div>
    );
  }

  const addFor = (outputId: string) =>
    update([
      ...activities,
      { id: makeId(), outputId, text: '', durationWeeks: undefined, resources: '', responsible: '' },
    ]);
  const patch = (id: string, p: Partial<ActivityItem>) =>
    update(activities.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const remove = (id: string) => update(activities.filter((a) => a.id !== id));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Untuk setiap output, rinci aktivitas yang dibutuhkan beserta durasi dan sumber daya.
      </p>

      {outputs.map((o, oi) => {
        const items = activities.filter((a) => a.outputId === o.id);
        return (
          <section key={o.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Output {oi + 1}</p>
                <h4 className="text-sm font-medium">{o.text || <em className="text-muted-foreground">(tanpa nama)</em>}</h4>
              </div>
              <Button variant="outline" size="sm" onClick={() => addFor(o.id)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Aktivitas
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Belum ada aktivitas.
                </p>
              )}
              {items.map((a) => (
                <div key={a.id} className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Label className="text-xs">Aktivitas</Label>
                    <Input value={a.text} onChange={(e) => patch(a.id, { text: e.target.value })} maxLength={300} placeholder="cth. Pelatihan guru lokal" className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Durasi (minggu)</Label>
                    <Input type="number" min={0} max={500} value={a.durationWeeks ?? ''} onChange={(e) => patch(a.id, { durationWeeks: e.target.value ? Number(e.target.value) : undefined })} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Penanggung jawab</Label>
                    <Input value={a.responsible ?? ''} onChange={(e) => patch(a.id, { responsible: e.target.value })} maxLength={120} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Sumber daya</Label>
                    <Input value={a.resources ?? ''} onChange={(e) => patch(a.id, { resources: e.target.value })} maxLength={200} placeholder="SDM, alat" className="mt-1" />
                  </div>
                  <div className="flex items-end justify-end md:col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}