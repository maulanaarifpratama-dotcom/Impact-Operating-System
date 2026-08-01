import { describe, it, expect } from 'vitest';
import { calculateMealAggregatedValue } from '../mealAggregator';
import { MealItem, MealTrackingEntry } from '../types';

describe('calculateMealAggregatedValue (SROI V2 Sync Engine)', () => {
  const mockMealItem: MealItem = {
    id: 'meal-1',
    lfa_project_id: 'proj-1',
    org_id: 'org-1',
    lfa_level: 'purpose',
    indicator_text: 'Jumlah UMKM Didampingi',
    indicator_type: 'cumulative_number',
    aggregation_method: 'sum',
    target_value: 100,
    status: 'Sedang Berjalan',
    disaggregation: [],
    mode: 'simple',
    sort_order: 1,
  };

  it('Scenario A: Cumulative Indicator with SUM aggregation', () => {
    const entries: MealTrackingEntry[] = [
      { id: '1', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 10, recorded_date: '2026-01-01', verification_state: 'verified' },
      { id: '2', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 20, recorded_date: '2026-02-01', verification_state: 'verified' },
      { id: '3', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 30, recorded_date: '2026-03-01', verification_state: 'verified' },
    ];

    const result = calculateMealAggregatedValue(mockMealItem, entries);
    expect(result.aggregatedValue).toBe(60);
    expect(result.progressPercent).toBe(60);
    expect(result.confidenceLevel).toBe('High');
    expect(result.verificationState).toBe('verified');
  });

  it('Scenario B: Percentage Indicator with LATEST aggregation', () => {
    const percentageItem: MealItem = {
      ...mockMealItem,
      indicator_type: 'snapshot_percentage',
      aggregation_method: 'latest',
      target_value: 100,
    };

    const entries: MealTrackingEntry[] = [
      { id: '1', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 70, recorded_date: '2026-01-01', verification_state: 'verified' },
      { id: '2', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 80, recorded_date: '2026-02-01', verification_state: 'verified' },
      { id: '3', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 90, recorded_date: '2026-03-01', verification_state: 'verified' },
    ];

    const result = calculateMealAggregatedValue(percentageItem, entries);
    expect(result.aggregatedValue).toBe(90);
    expect(result.formattedValue).toBe('90%');
  });

  it('Scenario C: Verified + Draft Entries (Prefers Verified & Confidence = High/Medium)', () => {
    const entries: MealTrackingEntry[] = [
      { id: '1', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 60, recorded_date: '2026-01-01', verification_state: 'verified' },
      { id: '2', meal_item_id: 'meal-1', lfa_project_id: 'proj-1', org_id: 'org-1', recorded_value: 80, recorded_date: '2026-02-01', verification_state: 'draft' },
    ];

    const result = calculateMealAggregatedValue(mockMealItem, entries);
    // Verified entry preferred -> 60
    expect(result.aggregatedValue).toBe(60);
    expect(result.confidenceLevel).toBe('Medium');
    expect(result.verificationState).toBe('verified');
  });

  it('Scenario D: Legacy / Fallback when no MEAL V2 entries exist', () => {
    const result = calculateMealAggregatedValue(mockMealItem, []);
    expect(result.aggregatedValue).toBe(100); // Fallback to target_value
    expect(result.confidenceLevel).toBe('Low');
    expect(result.isRealizedAchievement).toBe(false);
  });
});
