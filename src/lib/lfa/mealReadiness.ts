/**
 * MEAL Readiness & Indicator Health — P0 Quick Wins.
 *
 * Derived computations only — no persistence. Pure functions that
 * evaluate MEAL items for completeness and readiness.
 *
 * Uses existing MEAL item structure from MEALPlanner types.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type IndicatorHealth =
  | 'ready'
  | 'missing_target'
  | 'missing_method'
  | 'missing_mov'
  | 'missing_frequency'
  | 'missing_pic'
  | 'incomplete';

export interface MealReadinessResult {
  score: number;
  totalIndicators: number;
  readyIndicators: number;
  missingTarget: number;
  missingMethod: number;
  missingMov: number;
  missingFrequency: number;
  missingPic: number;
  incomplete: number;
}

export interface MealItemInput {
  id: string;
  indicator_text?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
  collection_method?: string | null;
  secondary_source?: string | null;
  frequency?: string | null;
  pic?: string | null;
}

// ── Evaluation ──────────────────────────────────────────────────────────────

export function getIndicatorHealth(item: MealItemInput): IndicatorHealth {
  const hasText = !!(item.indicator_text && item.indicator_text.trim());
  const hasTarget = item.target_value != null && item.target_value > 0;
  const hasMethod = !!(item.collection_method && item.collection_method.trim());
  const hasMov = !!(item.secondary_source && item.secondary_source.trim());
  const hasFrequency = !!(item.frequency && item.frequency.trim());
  const hasPic = !!(item.pic && item.pic.trim());

  if (!hasText) return 'incomplete';
  if (!hasTarget) return 'missing_target';
  if (!hasMethod) return 'missing_method';
  if (!hasMov) return 'missing_mov';
  if (!hasFrequency) return 'missing_frequency';
  if (!hasPic) return 'missing_pic';

  return 'ready';
}

export function computeMealReadiness(items: MealItemInput[]): MealReadinessResult {
  let ready = 0;
  let missingTarget = 0;
  let missingMethod = 0;
  let missingMov = 0;
  let missingFrequency = 0;
  let missingPic = 0;
  let incomplete = 0;

  for (const item of items) {
    const health = getIndicatorHealth(item);
    switch (health) {
      case 'ready': ready++; break;
      case 'missing_target': missingTarget++; break;
      case 'missing_method': missingMethod++; break;
      case 'missing_mov': missingMov++; break;
      case 'missing_frequency': missingFrequency++; break;
      case 'missing_pic': missingPic++; break;
      default: incomplete++; break;
    }
  }

  const total = items.length;
  const score = total > 0 ? Math.round((ready / total) * 100) : 0;

  return { score, totalIndicators: total, readyIndicators: ready,
    missingTarget, missingMethod, missingMov, missingFrequency, missingPic, incomplete };
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const INDICATOR_HEALTH_LABELS: Record<IndicatorHealth, string> = {
  ready: 'Siap',
  missing_target: 'Target belum diisi',
  missing_method: 'Metode belum diisi',
  missing_mov: 'MoV belum diisi',
  missing_frequency: 'Frekuensi belum diisi',
  missing_pic: 'PIC belum ditentukan',
  incomplete: 'Belum lengkap',
};

export function getHealthBadgeClass(health: IndicatorHealth): string {
  switch (health) {
    case 'ready': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'missing_target':
    case 'missing_method':
    case 'missing_mov':
    case 'missing_frequency':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'missing_pic': return 'bg-orange-100 text-orange-700 border-orange-300';
    default: return 'bg-red-100 text-red-700 border-red-300';
  }
}
