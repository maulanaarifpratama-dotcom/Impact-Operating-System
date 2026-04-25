import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { AssumptionItem, RiskItem, WizardData } from '@/lib/grant-writer/types';
import { makeId } from './StepStakeholders';

interface Props {
  data: WizardData;
  onChange: (updater: (prev: WizardData) => WizardData) => void;
}

const LEVELS: RiskItem['level'][] = ['goal', 'outcome', 'output', 'activity'];
const RATING: RiskItem['likelihood'][] = ['low', 'medium', 'high'];

export function StepRisks({ data, onChange }: Props) {
  const risks: RiskItem[] = data.risks ?? [];
  const assumptions: AssumptionItem[] = data.assumptions ?? [];

  const setRisks = (next: RiskItem[]) => onChange((p) => ({ ...p, risks: next }));
  const setAssumptions = (next: AssumptionItem[]) =>
    onChange((p) => ({ ...p, assumptions: next }));

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <header>
          <h3 className="text-base font-semibold">Risiko & Mitigasi</h3>
          <p className="text-sm text-muted-foreground">
            Identifikasi risiko per level intervensi beserta strategi mitigasinya.
          </p>
        </header>

        {risks.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Belum ada risiko yang dipetakan.
          </div>
        )}

        {risks.map((r) => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Deskripsi risiko</Label>
                <Input
                  value={r.description}
                  onChange={(e) =>
                    setRisks(risks.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
                  }
                  placeholder="Mis. Pergantian kepala sekolah di tengah program"
                />
              </div>
              <div>
                <Label>Level</Label>
                <Select
                  value={r.level}
                  onValueChange={(v) =>
                    setRisks(risks.map((x) => (x.id === r.id ? { ...x, level: v as RiskItem['level'] } : x)))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Likelihood</Label>
                  <Select
                    value={r.likelihood}
                    onValueChange={(v) =>
                      setRisks(risks.map((x) => (x.id === r.id ? { ...x, likelihood: v as RiskItem['likelihood'] } : x)))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATING.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact</Label>
                  <Select
                    value={r.impact}
                    onValueChange={(v) =>
                      setRisks(risks.map((x) => (x.id === r.id ? { ...x, impact: v as RiskItem['impact'] } : x)))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATING.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Strategi mitigasi</Label>
                <Textarea
                  rows={2}
                  value={r.mitigation}
                  onChange={(e) =>
                    setRisks(risks.map((x) => (x.id === r.id ? { ...x, mitigation: e.target.value } : x)))
                  }
                  placeholder="Mis. MoU dengan dinas pendidikan untuk kontinuitas program"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRisks(risks.filter((x) => x.id !== r.id))}>
                <Trash2 className="mr-1 h-4 w-4" /> Hapus
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-fit"
          onClick={() =>
            setRisks([
              ...risks,
              { id: makeId(), description: '', level: 'output', likelihood: 'medium', impact: 'medium', mitigation: '' },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Tambah risiko
        </Button>
      </section>

      <section className="grid gap-3">
        <header>
          <h3 className="text-base font-semibold">Asumsi Kunci</h3>
          <p className="text-sm text-muted-foreground">
            Asumsi eksternal yang harus terpenuhi agar logframe berjalan.
          </p>
        </header>

        {assumptions.map((a) => (
          <div key={a.id} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-[1fr_180px_auto]">
            <Input
              value={a.text}
              onChange={(e) =>
                setAssumptions(assumptions.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)))
              }
              placeholder="Mis. Stabilitas politik di wilayah sasaran tetap terjaga"
            />
            <Select
              value={a.level}
              onValueChange={(v) =>
                setAssumptions(assumptions.map((x) => (x.id === a.id ? { ...x, level: v as AssumptionItem['level'] } : x)))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => setAssumptions(assumptions.filter((x) => x.id !== a.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-fit"
          onClick={() => setAssumptions([...assumptions, { id: makeId(), text: '', level: 'output' }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Tambah asumsi
        </Button>
      </section>
    </div>
  );
}