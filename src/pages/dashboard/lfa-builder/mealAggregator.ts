import { MealItem, MealTrackingEntry, MealIndicatorType, MealAggregationMethod } from './types';

export interface MealAggregationResult {
  aggregatedValue: number;
  progressPercent: number;
  entryCount: number;
  formattedValue: string;
  verificationState: 'verified' | 'submitted' | 'draft';
  confidenceLevel: 'High' | 'Medium' | 'Low';
  isRealizedAchievement: boolean;
}

/**
 * Calculates aggregated MEAL indicator achievement with verification awareness & confidence scoring per SROI V2 & MEAL V2 specs.
 */
export function calculateMealAggregatedValue(
  mealItem: MealItem,
  entries: MealTrackingEntry[]
): MealAggregationResult {
  const itemEntries = entries.filter((e) => e.meal_item_id === mealItem.id);

  if (itemEntries.length === 0) {
    const fallbackTarget = mealItem.target_value ?? mealItem.endline_target ?? 0;
    return {
      aggregatedValue: fallbackTarget,
      progressPercent: 0,
      entryCount: 0,
      formattedValue: fallbackTarget.toLocaleString('id-ID'),
      verificationState: 'draft',
      confidenceLevel: 'Low',
      isRealizedAchievement: false,
    };
  }

  // PART C: Verification Awareness Priority (verified -> submitted -> draft)
  const verifiedEntries = itemEntries.filter((e) => e.verification_state === 'verified');
  const submittedEntries = itemEntries.filter((e) => e.verification_state === 'submitted');
  
  let activeEntries = itemEntries;
  let verificationState: 'verified' | 'submitted' | 'draft' = 'draft';
  
  if (verifiedEntries.length > 0) {
    activeEntries = verifiedEntries;
    verificationState = 'verified';
  } else if (submittedEntries.length > 0) {
    activeEntries = submittedEntries;
    verificationState = 'submitted';
  }

  // PART D: Confidence Scoring
  let confidenceLevel: 'High' | 'Medium' | 'Low' = 'Low';
  const verifiedRatio = verifiedEntries.length / itemEntries.length;
  if (verifiedRatio === 1) {
    confidenceLevel = 'High';
  } else if (verifiedRatio > 0) {
    confidenceLevel = 'Medium';
  }

  const type: MealIndicatorType = mealItem.indicator_type || 'cumulative_number';
  const method: MealAggregationMethod = mealItem.aggregation_method || (
    type === 'snapshot_percentage' || type === 'ratio' ? 'latest' :
    type === 'index_score' ? 'average' : 'sum'
  );

  const sorted = [...activeEntries].sort(
    (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
  );

  let aggVal = 0;
  if (method === 'sum') {
    aggVal = sorted.reduce((acc, curr) => acc + (curr.recorded_value || 0), 0);
  } else if (method === 'latest') {
    aggVal = sorted[sorted.length - 1]?.recorded_value ?? 0;
  } else if (method === 'average') {
    const sum = sorted.reduce((acc, curr) => acc + (curr.recorded_value || 0), 0);
    aggVal = Math.round((sum / sorted.length) * 10) / 10;
  } else if (method === 'max') {
    aggVal = Math.max(...sorted.map((e) => e.recorded_value || 0));
  }

  const target = mealItem.target_value || mealItem.endline_target || 100;
  let progress = 0;
  if (target > 0) {
    if (type === 'snapshot_percentage' && target === 100) {
      progress = Math.min(100, Math.max(0, Math.round(aggVal)));
    } else {
      progress = Math.min(100, Math.max(0, Math.round((aggVal / target) * 100)));
    }
  }

  let formatted = aggVal.toLocaleString('id-ID');
  if (type === 'snapshot_percentage') formatted = `${aggVal}%`;
  if (type === 'monetary_value') formatted = `Rp ${aggVal.toLocaleString('id-ID')}`;

  return {
    aggregatedValue: aggVal,
    progressPercent: progress,
    entryCount: sorted.length,
    formattedValue: formatted,
    verificationState,
    confidenceLevel,
    isRealizedAchievement: true,
  };
}
