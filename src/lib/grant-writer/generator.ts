import type {
  ContextData,
  LfaMatrix,
  ObjectivesData,
  RiskItem,
  Stakeholder,
  WizardData,
} from './types';

/**
 * Mock LFA generator. Builds a UN/OECD-DAC-style logframe matrix
 * from collected wizard data. Real model integration lands in a later chunk
 * via a Supabase Edge Function calling the Lovable AI Gateway.
 */
export function generateLfaMatrix(input: WizardData): LfaMatrix {
  const ctx: Partial<ContextData> = input.context ?? {};
  const obj: Partial<ObjectivesData> = input.objectives ?? {};
  const stakeholders: Stakeholder[] = input.stakeholders ?? [];
  const risks: RiskItem[] = input.risks ?? [];

  const beneficiaries = stakeholders
    .filter((s) => s.type === 'beneficiary')
    .map((s) => s.name)
    .join(', ') || 'kelompok sasaran';

  const goalIndicators = (input.indicators ?? []).filter((i) => i.level === 'goal');
  const outcomeIndicators = (input.indicators ?? []).filter((i) => i.level === 'outcome');
  const outputIndicators = (input.indicators ?? []).filter((i) => i.level === 'output');

  const goalAssumptions = (input.assumptions ?? [])
    .filter((a) => a.level === 'goal')
    .map((a) => a.text);
  const outcomeAssumptions = (input.assumptions ?? [])
    .filter((a) => a.level === 'outcome')
    .map((a) => a.text);
  const outputAssumptions = (input.assumptions ?? [])
    .filter((a) => a.level === 'output')
    .map((a) => a.text);

  const outcomes = (obj.outcomes ?? []).map((o) => ({
    intervention: o.text,
    indicators: outcomeIndicators
      .filter((i) => i.refId === o.id)
      .map((i) => formatIndicator(i.indicator, i.baseline, i.target)),
    meansOfVerification: outcomeIndicators
      .filter((i) => i.refId === o.id)
      .map((i) => i.meansOfVerification)
      .filter(Boolean),
    assumptions: outcomeAssumptions,
  }));

  const outputs = (obj.outputs ?? []).map((o) => ({
    intervention: o.text,
    indicators: outputIndicators
      .filter((i) => i.refId === o.id)
      .map((i) => formatIndicator(i.indicator, i.baseline, i.target)),
    meansOfVerification: outputIndicators
      .filter((i) => i.refId === o.id)
      .map((i) => i.meansOfVerification)
      .filter(Boolean),
    assumptions: outputAssumptions,
  }));

  const activities = (obj.outputs ?? []).map((o) => {
    const items = (input.activities ?? [])
      .filter((a) => a.outputId === o.id)
      .map((a) =>
        a.durationWeeks ? `${a.text} (${a.durationWeeks} minggu)` : a.text,
      );
    const inputs = (input.activities ?? [])
      .filter((a) => a.outputId === o.id && a.resources)
      .map((a) => a.resources as string);
    return { outputRef: o.text, items, inputs };
  });

  const matrix: LfaMatrix = {
    goal: {
      intervention:
        obj.goal ||
        `Meningkatkan kesejahteraan ${beneficiaries} di ${ctx.geography || 'wilayah sasaran'}.`,
      indicators: goalIndicators.map((i) =>
        formatIndicator(i.indicator, i.baseline, i.target),
      ),
      meansOfVerification: goalIndicators.map((i) => i.meansOfVerification).filter(Boolean),
      assumptions: goalAssumptions,
    },
    outcomes,
    outputs,
    activities,
    preconditions: risks
      .filter((r) => r.likelihood === 'high' && r.impact === 'high')
      .map((r) => `Mitigasi risiko: ${r.description} → ${r.mitigation}`),
    meta: {
      title: ctx.proposedTitle || 'Proposal Hibah',
      donorStandard: ctx.donorStandard || 'un_oecd_dac',
      targetDonor: ctx.targetDonor || 'Donor Internasional',
      sector: ctx.sector || '-',
      geography: ctx.geography || '-',
      durationMonths: ctx.durationMonths || 12,
      budgetIdr: ctx.budgetIdr || 0,
      generatedAt: new Date().toISOString(),
    },
  };

  return matrix;
}

function formatIndicator(indicator: string, baseline: string, target: string) {
  const parts = [indicator];
  if (baseline) parts.push(`baseline: ${baseline}`);
  if (target) parts.push(`target: ${target}`);
  return parts.join(' — ');
}

/** Render the LFA matrix + project context as a donor-ready Markdown proposal. */
export function renderProposalMarkdown(input: WizardData, matrix: LfaMatrix): string {
  const ctx: Partial<ContextData> = input.context ?? {};
  const stakeholders: Stakeholder[] = input.stakeholders ?? [];
  const problems = input.problemTree ?? [];
  const risks = input.risks ?? [];

  const core = problems.find((p) => p.type === 'core');
  const causes = problems.filter((p) => p.type === 'cause');
  const effects = problems.filter((p) => p.type === 'effect');

  const fmtIdr = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const lines: string[] = [];
  lines.push(`# ${matrix.meta.title}`);
  lines.push('');
  lines.push(`**Donor target:** ${matrix.meta.targetDonor}  `);
  lines.push(`**Standar:** ${matrix.meta.donorStandard.toUpperCase()}  `);
  lines.push(`**Sektor:** ${matrix.meta.sector} · **Wilayah:** ${matrix.meta.geography}  `);
  lines.push(`**Durasi:** ${matrix.meta.durationMonths} bulan · **Anggaran:** ${fmtIdr(matrix.meta.budgetIdr)}  `);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Ringkasan Eksekutif');
  lines.push('');
  lines.push(ctx.background || 'Latar belakang akan diisi di tahap selanjutnya.');
  lines.push('');
  lines.push('## 2. Pernyataan Masalah');
  lines.push('');
  if (core) lines.push(`**Masalah inti:** ${core.text}`);
  if (causes.length) {
    lines.push('');
    lines.push('**Akar penyebab:**');
    causes.forEach((c) => lines.push(`- ${c.text}`));
  }
  if (effects.length) {
    lines.push('');
    lines.push('**Dampak yang ditimbulkan:**');
    effects.forEach((e) => lines.push(`- ${e.text}`));
  }
  if (!core && !causes.length && !effects.length) {
    lines.push(ctx.problemStatement || '_Pohon masalah belum diisi._');
  }
  lines.push('');
  lines.push('## 3. Pemangku Kepentingan');
  lines.push('');
  if (stakeholders.length === 0) {
    lines.push('_Belum ada pemangku kepentingan yang dipetakan._');
  } else {
    lines.push('| Nama | Tipe | Peran | Pengaruh | Kepentingan |');
    lines.push('|---|---|---|---|---|');
    stakeholders.forEach((s) => {
      lines.push(`| ${s.name} | ${s.type} | ${s.role} | ${s.influence} | ${s.interest} |`);
    });
  }
  lines.push('');
  lines.push('## 4. Tujuan & Sasaran');
  lines.push('');
  lines.push(`**Goal (Impact):** ${matrix.goal.intervention}`);
  lines.push('');
  lines.push('**Outcomes (Purpose):**');
  matrix.outcomes.forEach((o, i) => lines.push(`${i + 1}. ${o.intervention}`));
  lines.push('');
  lines.push('**Outputs (Deliverables):**');
  matrix.outputs.forEach((o, i) => lines.push(`${i + 1}. ${o.intervention}`));
  lines.push('');
  lines.push('## 5. Logical Framework Matrix');
  lines.push('');
  lines.push('| Hierarki | Narasi | Indikator (OVI) | Means of Verification | Asumsi |');
  lines.push('|---|---|---|---|---|');
  lines.push(
    `| **Goal** | ${esc(matrix.goal.intervention)} | ${list(matrix.goal.indicators)} | ${list(matrix.goal.meansOfVerification)} | ${list(matrix.goal.assumptions)} |`,
  );
  matrix.outcomes.forEach((o, i) => {
    lines.push(
      `| **Outcome ${i + 1}** | ${esc(o.intervention)} | ${list(o.indicators)} | ${list(o.meansOfVerification)} | ${list(o.assumptions)} |`,
    );
  });
  matrix.outputs.forEach((o, i) => {
    lines.push(
      `| **Output ${i + 1}** | ${esc(o.intervention)} | ${list(o.indicators)} | ${list(o.meansOfVerification)} | ${list(o.assumptions)} |`,
    );
  });
  lines.push('');
  lines.push('## 6. Rencana Aktivitas');
  lines.push('');
  matrix.activities.forEach((a, i) => {
    lines.push(`### Output ${i + 1}: ${a.outputRef}`);
    if (a.items.length) {
      a.items.forEach((it) => lines.push(`- ${it}`));
    } else {
      lines.push('_Belum ada aktivitas yang dirinci._');
    }
    if (a.inputs.length) {
      lines.push('');
      lines.push(`**Sumber daya:** ${a.inputs.join('; ')}`);
    }
    lines.push('');
  });
  lines.push('## 7. Risiko & Mitigasi');
  lines.push('');
  if (!risks.length) {
    lines.push('_Belum ada risiko yang dipetakan._');
  } else {
    lines.push('| Risiko | Level | Likelihood | Impact | Mitigasi |');
    lines.push('|---|---|---|---|---|');
    risks.forEach((r) => {
      lines.push(`| ${esc(r.description)} | ${r.level} | ${r.likelihood} | ${r.impact} | ${esc(r.mitigation)} |`);
    });
  }
  lines.push('');
  lines.push('## 8. Anggaran (Ringkasan)');
  lines.push('');
  lines.push(`Total anggaran yang diajukan: **${fmtIdr(matrix.meta.budgetIdr)}** untuk ${matrix.meta.durationMonths} bulan.`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`_Dokumen dihasilkan oleh Impactory Grant Writer pada ${new Date(matrix.meta.generatedAt).toLocaleString('id-ID')}._`);

  return lines.join('\n');
}

function esc(s: string) {
  return (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
function list(items: string[]) {
  if (!items.length) return '_—_';
  return items.map(esc).join('<br/>');
}