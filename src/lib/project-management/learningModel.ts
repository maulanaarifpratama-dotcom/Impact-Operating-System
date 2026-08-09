/**
 * Canonical PM Learning & Evaluation domain (MEAL-P1 MVP).
 *
 * Learning Entry = frequent, low-ceremony reflection built on top of ACR
 * (Evidence/Facts/Notes/Verification) — it never duplicates ACR data, only
 * optionally references the same Activity/Stage. Evaluation Finding = the
 * fewer, formal, periodic judgment layer above Learning; this module is the
 * single source of truth for its severity labels/options.
 */

import type { EvaluationFindingSeverity } from '@/pages/dashboard/lfa-builder/types';

const SEVERITY_LABELS: Record<EvaluationFindingSeverity, string> = {
  informational: 'Informational',
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export function getSeverityLabel(severity?: string | null): string {
  return SEVERITY_LABELS[(severity as EvaluationFindingSeverity) || 'minor'] || 'Minor';
}

export const SEVERITY_OPTIONS: { value: EvaluationFindingSeverity; emoji: string; label: string }[] = [
  { value: 'informational', emoji: 'ℹ️', label: 'Informational' },
  { value: 'minor', emoji: '🟡', label: 'Minor' },
  { value: 'major', emoji: '🟠', label: 'Major' },
  { value: 'critical', emoji: '🔴', label: 'Critical' },
];

export function getSeverityBadgeClass(severity?: string | null): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    case 'major': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'informational': return 'bg-slate-100 text-slate-700 border-slate-300';
    default: return 'bg-amber-100 text-amber-800 border-amber-300';
  }
}
