import type { QuickWizardData } from './types';
import { ORG_TYPES, SDG_GOALS } from './types';

const fmtIdr = (n: number) =>
  n
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

export function renderQuickProposalMarkdown(data: QuickWizardData): string {
  const o = data.organization ?? {};
  const p = data.program ?? {};
  const b = data.budget ?? {};
  const orgTypeLabel = ORG_TYPES.find((t) => t.value === o.orgType)?.label ?? '—';
  const sdgList = (o.sdgFocus ?? [])
    .map((n) => {
      const g = SDG_GOALS.find((s) => s.num === n);
      return g ? `SDG ${g.num} — ${g.title}` : `SDG ${n}`;
    })
    .join(', ');

  const donorStandardLabel = p.donorStandard ? p.donorStandard.toUpperCase().replace(/_/g, ' ') : '—';

  return `# ${p.programTitle ?? 'Proposal Program'}

**Diusulkan oleh:** ${o.orgName ?? '—'}
**Sektor:** ${p.sector ?? '—'}
**Lokasi:** ${b.geography ?? '—'}
**Durasi:** ${b.durationMonths ?? '—'} bulan
**Anggaran:** ${fmtIdr(b.budgetIdr ?? 0)}
**Donor target:** ${p.targetDonor ?? '—'}
**Standar donor:** ${donorStandardLabel}

---

## 1. Tentang Organisasi

**${o.orgName ?? '—'}** — ${orgTypeLabel}${o.yearFounded ? `, didirikan ${o.yearFounded}` : ''}

**Fokus SDGs:** ${sdgList || '_Belum dipilih_'}

## 2. Latar Belakang

${p.background ?? '_Belum diisi._'}

## 3. Permasalahan

${p.problemStatement ?? '_Belum diisi._'}

## 4. Solusi yang Ditawarkan & Mitra Kerja

${p.proposedSolution ?? '_Belum diisi._'}

**Mitra & Aktor Penting yang Terlibat:**
${p.partnersAndActors ?? '_Belum diisi._'}

## 5. Penerima Manfaat

- **Jumlah:** ${b.beneficiaryCount ?? '—'} orang
- **Lokasi:** ${b.geography ?? '—'}

${b.beneficiaryDescription ?? '_Profil penerima manfaat belum diisi._'}

## 6. Outcome yang Diharapkan

${p.expectedOutcomes ?? '_Belum diisi._'}

## 7. Anggaran

**Total:** ${fmtIdr(b.budgetIdr ?? 0)} untuk ${b.durationMonths ?? '—'} bulan

${b.budgetBreakdown ? `**Rincian:**\n\n${b.budgetBreakdown}` : '_Rincian anggaran belum diisi._'}

---

_Proposal ini dihasilkan otomatis oleh Impactory Grant Writer (mode Quick) pada ${new Date().toLocaleString('id-ID')}._
`;
}

export function quickCompleteness(data: QuickWizardData): {
  filled: number;
  total: number;
  missing: string[];
} {
  const o = data.organization ?? {};
  const p = data.program ?? {};
  const b = data.budget ?? {};
  const checks: { ok: boolean; label: string }[] = [
    { ok: !!o.orgName, label: 'Nama organisasi' },
    { ok: !!o.orgType, label: 'Jenis organisasi' },
    { ok: (o.sdgFocus?.length ?? 0) > 0, label: 'Fokus SDGs' },
    { ok: !!o.yearFounded, label: 'Tahun berdiri' },
    { ok: !!p.programTitle, label: 'Judul program' },
    { ok: !!p.sector, label: 'Sektor' },
    { ok: !!p.background, label: 'Latar belakang' },
    { ok: !!p.problemStatement, label: 'Pernyataan masalah' },
    { ok: !!p.proposedSolution, label: 'Solusi' },
    { ok: !!p.expectedOutcomes, label: 'Outcome' },
    { ok: !!p.partnersAndActors, label: 'Mitra & aktor penting' },
    { ok: !!p.donorStandard, label: 'Standar donor' },
    { ok: !!b.beneficiaryCount, label: 'Jumlah penerima manfaat' },
    { ok: !!b.beneficiaryDescription, label: 'Profil penerima manfaat' },
    { ok: !!b.geography, label: 'Lokasi' },
    { ok: !!b.durationMonths, label: 'Durasi' },
    { ok: !!b.budgetIdr, label: 'Anggaran' },
  ];
  const filled = checks.filter((c) => c.ok).length;
  return {
    filled,
    total: checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}