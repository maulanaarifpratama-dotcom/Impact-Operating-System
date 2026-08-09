/**
 * Canonical MEAL Learning V1 domain (organization-level knowledge asset).
 *
 * Learning is not project-scoped and not derived — it is authored,
 * reviewed, and published deliberately by a MEAL/M&E role, synthesizing a
 * pattern across multiple ACRs and/or Evaluation Findings (its Evidence
 * Base). Related Projects are never stored on the entry itself; they are
 * always computed from the Evidence Base's underlying records, so they can
 * never drift out of sync — see resolveRelatedProjectIds() usage at the
 * call sites in the Learning pages.
 */

import type { LearningInsightType, LearningScope, LearningStatus } from '@/pages/dashboard/lfa-builder/types';

const INSIGHT_TYPE_LABELS: Record<LearningInsightType, string> = {
  good_practice: 'Good Practice',
  failure_pattern: 'Failure Pattern',
  mixed: 'Mixed',
};

export function getInsightTypeLabel(type?: string | null): string {
  return INSIGHT_TYPE_LABELS[(type as LearningInsightType) || 'mixed'] || 'Mixed';
}

export const INSIGHT_TYPE_OPTIONS: { value: LearningInsightType; label: string }[] = [
  { value: 'good_practice', label: 'Good Practice' },
  { value: 'failure_pattern', label: 'Failure Pattern' },
  { value: 'mixed', label: 'Mixed' },
];

export function getInsightTypeBadgeClass(type?: string | null): string {
  switch (type) {
    case 'good_practice': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400';
    case 'failure_pattern': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  }
}

const SCOPE_LABELS: Record<LearningScope, string> = {
  project_specific: 'Project-specific',
  programme_wide: 'Programme-wide',
  organization_wide: 'Organization-wide',
};

export function getScopeLabel(scope?: string | null): string {
  return SCOPE_LABELS[(scope as LearningScope) || 'project_specific'] || 'Project-specific';
}

export const SCOPE_OPTIONS: { value: LearningScope; label: string }[] = [
  { value: 'project_specific', label: 'Project-specific' },
  { value: 'programme_wide', label: 'Programme-wide' },
  { value: 'organization_wide', label: 'Organization-wide' },
];

const STATUS_LABELS: Record<LearningStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export function getLearningStatusLabel(status?: string | null): string {
  return STATUS_LABELS[(status as LearningStatus) || 'draft'] || 'Draft';
}

export function getLearningStatusBadgeClass(status?: string | null): string {
  return status === 'published'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
}

/**
 * Locked permission rule: a Draft is manageable (view/edit/publish/delete)
 * only by its own author, never by any other owner/admin. Enforced again
 * here for UI gating — RLS is the real boundary.
 */
export function canManageLearning(entry: { status: string; authored_by: string }, currentUserId: string | null): boolean {
  return !!currentUserId && entry.status === 'draft' && entry.authored_by === currentUserId;
}
