import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { QuickWizardData } from '@/lib/grant-writer/types';
import { quickCompleteness } from '@/lib/grant-writer/quickGenerator';

interface Props {
  data: QuickWizardData;
}

export function QuickStepGenerate({ data }: Props) {
  const { filled, total, missing } = quickCompleteness(data);
  const pct = Math.round((filled / total) * 100);
  const o = data.organization ?? {};
  const p = data.program ?? {};
  const b = data.budget ?? {};

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Kelengkapan data</p>
            <p className="text-xs text-muted-foreground">
              {filled} dari {total} bagian terisi
            </p>
          </div>
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-3 h-2" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          title="Organisasi"
          rows={[
            ['Nama', o.orgName],
            ['Kontak', o.contactPerson],
          ]}
        />
        <SummaryCard
          title="Program"
          rows={[
            ['Judul', p.programTitle],
            ['Sektor', p.sector],
          ]}
        />
        <SummaryCard
          title="Anggaran"
          rows={[
            ['Lokasi', b.geography],
            [
              'Anggaran',
              b.budgetIdr
                ? new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(b.budgetIdr)
                : undefined,
            ],
            ['Durasi', b.durationMonths ? `${b.durationMonths} bulan` : undefined],
          ]}
        />
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Bagian yang belum diisi ({missing.length})
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {missing.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <Circle className="h-3 w-3" /> {m}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Anda tetap bisa generate, tapi proposal akan menandai bagian kosong.
          </p>
        </div>
      )}

      {missing.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <span>Semua bagian sudah lengkap. Siap untuk generate proposal.</span>
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Klik <strong className="text-foreground">Buat Proposal</strong> di bawah untuk
            menghasilkan dokumen proposal donor-ready dalam format Markdown. Anda bisa
            mengeditnya kembali setelah pratinjau.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | number | undefined][];
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="truncate text-right font-medium">{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}