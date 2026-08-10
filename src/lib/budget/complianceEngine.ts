/**
 * Budget Compliance Engine v1.0 (MVP)
 *
 * Pure functions that evaluate Programme Design budget items against
 * SBM and INKINDO reference data. Produces compliance scores, findings,
 * and per-item assessments.
 *
 * All reference data is ESTIMATE_UNVERIFIED per GW-B1 contract.
 * Compliance is guidance — never enforcement. Compliance never
 * automatically modifies budget design.
 *
 * This module is PD-only. PM consumes compliance history as read-only.
 */

import { SBM_FLAT_ITEMS, type SbmItem } from '@/data/sbm2026';
import { INKINDO_ROLES, calculateInkindoRate, INKINDO_PROVINCE_MULTIPLIERS, type InkindoRole } from '@/data/inkindo2026';

// ── Types ───────────────────────────────────────────────────────────────────

export type ComplianceStatus =
  | 'compliant'
  | 'warning'
  | 'violation'
  | 'not_applicable'
  | 'justified';

export type ComplianceSource = 'sbm' | 'inkindo';

export interface ComplianceFinding {
  findingId: string;
  budgetItemId: string;
  budgetItemName: string;
  source: ComplianceSource;
  sourceReference: string;
  rule: string;
  referenceValue: number;
  actualValue: number;
  unit: string;
  variancePct: number;
  severity: 'info' | 'warning' | 'violation';
  explanation: string;
  recommendation: string;
  status: ComplianceStatus;
  justification?: string;
}

export interface BudgetComplianceResult {
  score: number | null;
  totalItems: number;
  evaluableItems: number;
  compliantCount: number;
  warningCount: number;
  violationCount: number;
  notApplicableCount: number;
  justifiedCount: number;
  findings: ComplianceFinding[];
}

export interface BudgetLineInput {
  id: string;
  itemName: string;
  category: string;
  unit: string;
  unitPriceIdr: number | null;
  volume: number | null;
  justification?: string;
  province?: string;
  isNgoMode?: boolean;
}

// ── SBM Matching ────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findSbmMatch(item: BudgetLineInput): SbmItem | null {
  const itemName = normalize(item.itemName);
  const category = normalize(item.category || '');

  // Direct match first
  const direct = SBM_FLAT_ITEMS.find(
    (s) => normalize(s.name) === itemName || normalize(s.category) === category
  );
  if (direct) return direct;

  // Partial match
  const partial = SBM_FLAT_ITEMS.find(
    (s) =>
      itemName.includes(normalize(s.name)) ||
      normalize(s.name).includes(itemName) ||
      (category && normalize(s.category).includes(category))
  );
  return partial || null;
}

// ── INKINDO Matching ────────────────────────────────────────────────────────

function findInkindoMatch(item: BudgetLineInput): { role: InkindoRole; rate: number } | null {
  const itemName = normalize(item.itemName);
  const role = INKINDO_ROLES.find(
    (r) =>
      normalize(r.role) === itemName ||
      itemName.includes(normalize(r.role)) ||
      normalize(r.role).includes(itemName)
  );
  if (!role) return null;

  let unit: 'Month' | 'Week' | 'Day' | 'Hour' = 'Month';
  const u = normalize(item.unit);
  if (u.includes('hari')) unit = 'Day';
  else if (u.includes('minggu')) unit = 'Week';
  else if (u.includes('jam')) unit = 'Hour';

  const rate = calculateInkindoRate(
    role.role,
    item.province || 'DKI Jakarta',
    unit,
    item.isNgoMode ?? true,
  );
  return { role, rate };
}

// ── Compliance Evaluation ───────────────────────────────────────────────────

const WARNING_THRESHOLD = 1.0;  // >100% of reference → warning
const VIOLATION_THRESHOLD = 2.0; // >200% of reference → violation

function evaluateSbm(item: BudgetLineInput): ComplianceFinding | null {
  const ref = findSbmMatch(item);
  if (!ref) return null;

  const unitPrice = item.unitPriceIdr ?? 0;
  if (unitPrice <= 0) return null;

  const variancePct = ((unitPrice - ref.price) / ref.price) * 100;
  const severity: 'info' | 'warning' | 'violation' =
    unitPrice <= ref.price * WARNING_THRESHOLD ? 'info' :
    unitPrice <= ref.price * VIOLATION_THRESHOLD ? 'warning' : 'violation';

  const status: ComplianceStatus =
    severity === 'info' ? 'compliant' :
    severity === 'warning' ? 'warning' : 'violation';

  return {
    findingId: `sbm-${item.id}`,
    budgetItemId: item.id,
    budgetItemName: item.itemName,
    source: 'sbm',
    sourceReference: `SBM 2026 — ${ref.category}: ${ref.name}`,
    rule: `${ref.name} maksimal Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit}`,
    referenceValue: ref.price,
    actualValue: unitPrice,
    unit: ref.unit,
    variancePct: Math.round(variancePct),
    severity,
    explanation: severity === 'info'
      ? `Item "${item.itemName}" sesuai dengan standar SBM ${ref.name}.`
      : severity === 'warning'
        ? `Item "${item.itemName}" melebihi standar SBM ${ref.name} sebesar ${Math.round(variancePct)}%.`
        : `Item "${item.itemName}" melebihi standar SBM ${ref.name} sebesar ${Math.round(variancePct)}% (lebih dari 2x standar).`,
    recommendation: severity === 'info'
      ? 'Tidak diperlukan tindakan.'
      : `Sesuaikan ke Rp ${ref.price.toLocaleString('id-ID')}/${ref.unit} atau berikan justifikasi.`,
    status,
  };
}

function evaluateInkindo(item: BudgetLineInput): ComplianceFinding | null {
  const match = findInkindoMatch(item);
  if (!match) return null;

  const unitPrice = item.unitPriceIdr ?? 0;
  if (unitPrice <= 0) return null;

  const { role, rate } = match;
  const variancePct = ((unitPrice - rate) / rate) * 100;
  const severity: 'info' | 'warning' | 'violation' =
    unitPrice <= rate * WARNING_THRESHOLD ? 'info' :
    unitPrice <= rate * VIOLATION_THRESHOLD ? 'warning' : 'violation';

  const status: ComplianceStatus =
    severity === 'info' ? 'compliant' :
    severity === 'warning' ? 'warning' : 'violation';

  return {
    findingId: `inkindo-${item.id}`,
    budgetItemId: item.id,
    budgetItemName: item.itemName,
    source: 'inkindo',
    sourceReference: `INKINDO 2026 — ${role.category}: ${role.role}`,
    rule: `${role.role} maksimal Rp ${rate.toLocaleString('id-ID')}/${item.unit || 'Bulan'} (${item.province || 'DKI Jakarta'}, ${item.isNgoMode !== false ? 'NGO 70%' : 'Komersial 100%'})`,
    referenceValue: rate,
    actualValue: unitPrice,
    unit: item.unit || 'Bulan',
    variancePct: Math.round(variancePct),
    severity,
    explanation: severity === 'info'
      ? `Item "${item.itemName}" sesuai dengan standar INKINDO ${role.role}.`
      : severity === 'warning'
        ? `Item "${item.itemName}" melebihi standar INKINDO ${role.role} sebesar ${Math.round(variancePct)}%.`
        : `Item "${item.itemName}" melebihi standar INKINDO ${role.role} sebesar ${Math.round(variancePct)}% (lebih dari 2x standar).`,
    recommendation: severity === 'info'
      ? 'Tidak diperlukan tindakan.'
      : `Sesuaikan ke Rp ${rate.toLocaleString('id-ID')}/${item.unit || 'Bulan'} atau berikan justifikasi.`,
    status,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function evaluateBudgetCompliance(
  items: BudgetLineInput[],
  justifications?: Map<string, string>,
): BudgetComplianceResult {
  const findings: ComplianceFinding[] = [];
  let evaluableCount = 0;

  for (const item of items) {
    const sbmFinding = evaluateSbm(item);
    const inkindoFinding = evaluateInkindo(item);

    if (sbmFinding) {
      evaluableCount++;
      if (justifications?.has(item.id)) {
        sbmFinding.status = 'justified';
        sbmFinding.justification = justifications.get(item.id);
      }
      findings.push(sbmFinding);
    }
    if (inkindoFinding) {
      if (!sbmFinding) evaluableCount++;
      if (justifications?.has(item.id)) {
        inkindoFinding.status = 'justified';
        inkindoFinding.justification = justifications.get(item.id);
      }
      findings.push(inkindoFinding);
    }
  }

  // Deduplicate evaluable counts (items with both SBM and INKINDO match count once)
  const evalIds = new Set(findings.map((f) => f.budgetItemId));

  const compliant = findings.filter((f) => f.status === 'compliant');
  const warnings = findings.filter((f) => f.status === 'warning');
  const violations = findings.filter((f) => f.status === 'violation');
  const justified = findings.filter((f) => f.status === 'justified');
  const notApplicableCount = items.length - evalIds.size;

  // Weighted score: compliant=100, warning=50, violation=0, justified=75
  let totalWeight = 0;
  let weightedSum = 0;
  for (const f of findings) {
    const weight = (f.actualValue || f.referenceValue);
    const points =
      f.status === 'compliant' ? 100 :
      f.status === 'justified' ? 75 :
      f.status === 'warning' ? 50 : 0;
    weightedSum += points * weight;
    totalWeight += weight;
  }

  const score = evalIds.size > 0 && totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : null;

  return {
    score,
    totalItems: items.length,
    evaluableItems: evalIds.size,
    compliantCount: compliant.length,
    warningCount: warnings.length,
    violationCount: violations.length,
    notApplicableCount,
    justifiedCount: justified.length,
    findings,
  };
}

export function getComplianceStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant': return 'Sesuai';
    case 'warning': return 'Perlu Perhatian';
    case 'violation': return 'Melebihi Standar';
    case 'not_applicable': return 'Tidak Berlaku';
    case 'justified': return 'Dijustifikasi';
  }
}

export function getComplianceBadgeClass(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'warning': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'violation': return 'bg-red-100 text-red-700 border-red-300';
    case 'not_applicable': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'justified': return 'bg-blue-100 text-blue-700 border-blue-300';
  }
}

export const COMPLIANCE_SOURCE_LABELS: Record<ComplianceSource, string> = {
  sbm: 'SBM 2026',
  inkindo: 'INKINDO 2026',
};
