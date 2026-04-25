import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProblemNode, WizardData } from '@/lib/grant-writer/types';
import { makeId } from './StepStakeholders';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

export function StepProblemTree({ data, onChange }: Props) {
  const tree: ProblemNode[] = data.problemTree ?? [];
  const core = tree.find((n) => n.type === 'core');
  const causes = tree.filter((n) => n.type === 'cause');
  const effects = tree.filter((n) => n.type === 'effect');

  const update = (next: ProblemNode[]) => onChange((p) => ({ ...p, problemTree: next }));

  const setCore = (text: string) => {
    if (core) {
      update(tree.map((n) => (n.id === core.id ? { ...n, text } : n)));
    } else {
      update([...tree, { id: makeId(), text, type: 'core' }]);
    }
  };
  const addNode = (type: 'cause' | 'effect') =>
    update([...tree, { id: makeId(), text: '', type, parentId: core?.id ?? null }]);
  const patchNode = (id: string, text: string) =>
    update(tree.map((n) => (n.id === id ? { ...n, text } : n)));
  const removeNode = (id: string) => update(tree.filter((n) => n.id !== id));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Pohon masalah memetakan <strong>masalah inti</strong> di tengah, dengan <strong>akar penyebab</strong> di bawah dan <strong>dampak</strong> di atas.
      </p>

      <section>
        <Label className="text-sm font-semibold text-foreground">Dampak yang ditimbulkan (effects)</Label>
        <p className="text-xs text-muted-foreground">Apa konsekuensi dari masalah inti?</p>
        <div className="mt-2 space-y-2">
          {effects.map((e) => (
            <NodeRow key={e.id} value={e.text} onChange={(v) => patchNode(e.id, v)} onDelete={() => removeNode(e.id)} placeholder="cth. Putus sekolah meningkat" />
          ))}
          <Button variant="outline" size="sm" onClick={() => addNode('effect')}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah dampak
          </Button>
        </div>
      </section>

      <section className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
        <Label className="text-sm font-semibold text-primary">Masalah inti *</Label>
        <p className="text-xs text-muted-foreground">Satu kalimat masalah utama.</p>
        <Textarea
          value={core?.text ?? ''}
          onChange={(e) => setCore(e.target.value)}
          maxLength={500}
          placeholder="cth. Anak nelayan di Sumba Timur tidak mendapat akses pendidikan menengah berkualitas."
          className="mt-2"
        />
      </section>

      <section>
        <Label className="text-sm font-semibold text-foreground">Akar penyebab (causes)</Label>
        <p className="text-xs text-muted-foreground">Mengapa masalah inti terjadi?</p>
        <div className="mt-2 space-y-2">
          {causes.map((c) => (
            <NodeRow key={c.id} value={c.text} onChange={(v) => patchNode(c.id, v)} onDelete={() => removeNode(c.id)} placeholder="cth. Jarak ke sekolah lebih dari 15 km" />
          ))}
          <Button variant="outline" size="sm" onClick={() => addNode('cause')}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah penyebab
          </Button>
        </div>
      </section>
    </div>
  );
}

function NodeRow({ value, onChange, onDelete, placeholder }: { value: string; onChange: (v: string) => void; onDelete: () => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={300} />
      <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}