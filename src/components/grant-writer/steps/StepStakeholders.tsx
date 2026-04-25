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
import type { Stakeholder, WizardData } from '@/lib/grant-writer/types';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

const TYPE_LABELS: Record<Stakeholder['type'], string> = {
  beneficiary: 'Penerima Manfaat',
  partner: 'Mitra Pelaksana',
  government: 'Pemerintah',
  donor: 'Donor / Funder',
  community: 'Komunitas',
  other: 'Lainnya',
};

const LEVELS: Stakeholder['influence'][] = ['low', 'medium', 'high'];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function StepStakeholders({ data, onChange }: Props) {
  const items: Stakeholder[] = data.stakeholders ?? [];
  const update = (next: Stakeholder[]) => onChange((p) => ({ ...p, stakeholders: next }));

  const add = () =>
    update([
      ...items,
      { id: uid(), name: '', type: 'beneficiary', role: '', influence: 'medium', interest: 'medium' },
    ]);

  const patch = (id: string, p: Partial<Stakeholder>) =>
    update(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id: string) => update(items.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Petakan minimal 1 penerima manfaat dan 1 mitra. Pengaruh & kepentingan akan menentukan strategi engagement Anda.
      </p>

      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-background p-4">
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="text-xs">Nama</Label>
                <Input
                  value={s.name}
                  onChange={(e) => patch(s.id, { name: e.target.value })}
                  maxLength={120}
                  placeholder="cth. Anak nelayan usia 7-15 tahun"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Tipe</Label>
                <Select value={s.type} onValueChange={(v) => patch(s.id, { type: v as Stakeholder['type'] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Peran</Label>
                <Input
                  value={s.role}
                  onChange={(e) => patch(s.id, { role: e.target.value })}
                  maxLength={120}
                  placeholder="cth. Penerima beasiswa"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Pengaruh</Label>
                <Select value={s.influence} onValueChange={(v) => patch(s.id, { influence: v as Stakeholder['influence'] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Minat</Label>
                <Select value={s.interest} onValueChange={(v) => patch(s.id, { interest: v as Stakeholder['interest'] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-12 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => remove(s.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={add}>
        <Plus className="mr-1.5 h-4 w-4" /> Tambah pemangku kepentingan
      </Button>
    </div>
  );
}

export { uid as makeId };