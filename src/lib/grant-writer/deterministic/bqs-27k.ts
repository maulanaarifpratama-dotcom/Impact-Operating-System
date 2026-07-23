/**
 * Blueprint Quality Score V2 Engine (BQS-27K)
 * Module: bqs-27k.ts
 *
 * Responsibilities:
 * - Computes BQS-27K score (0-100) across all 5 layers of the 27.5k Brain:
 *   1. Outcome Expansion Recall & Quality (20%)
 *   2. Output Expansion Recall & Quality (20%)
 *   3. Activity Decomposition Density & Hierarchy (20%)
 *   4. Indicator Scaffolding Coverage & Quality (20%)
 *   5. Cost Driver Extraction Coverage & Quality (20%)
 * - Target Score: BQS-27K >= 88.
 */

import type { CanonicalProposalPayloadV2 } from './types';

export interface BQS27KResult {
  total_score: number;
  breakdown: {
    outcome_quality_score: number;
    output_quality_score: number;
    activity_quality_score: number;
    indicator_quality_score: number;
    cost_driver_quality_score: number;
  };
  metrics: {
    outcome_count: number;
    output_count: number;
    activity_count: number;
    outcome_indicator_coverage: number;
    output_indicator_coverage: number;
    cost_driver_coverage: number;
    orphan_outputs_count: number;
    orphan_activities_count: number;
  };
  status: 'PASS' | 'WARNING' | 'FAIL';
  issues: string[];
}

export function evaluateBQS27K(payload: CanonicalProposalPayloadV2): BQS27KResult {
  const issues: string[] = [];
  const outcomes = payload.outcomes || [];

  let totalOutputs = 0;
  let totalActivities = 0;
  let totalOutcomeIndicators = 0;
  let totalOutputIndicators = 0;
  let totalCostDrivers = 0;

  let orphanOutputs = 0;
  let orphanActivities = 0;

  let outputsWithIndicators = 0;
  let activitiesWithCostDrivers = 0;

  const validOutcomeIds = new Set(outcomes.map((oc) => oc.id));
  const validOutputIds = new Set<string>();

  for (const oc of outcomes) {
    if (oc.indicators && oc.indicators.length > 0) {
      totalOutcomeIndicators += oc.indicators.length;
    }

    const outputs = oc.outputs || [];
    totalOutputs += outputs.length;

    for (const op of outputs) {
      validOutputIds.add(op.id);

      if (!op.parent_outcome_id || !validOutcomeIds.has(op.parent_outcome_id)) {
        orphanOutputs++;
      }

      if (op.indicators && op.indicators.length > 0) {
        totalOutputIndicators += op.indicators.length;
        outputsWithIndicators++;
      }

      const activities = op.activities || [];
      totalActivities += activities.length;

      for (const act of activities) {
        if (!act.parent_output_id || !validOutputIds.has(act.parent_output_id)) {
          orphanActivities++;
        }

        const cdList = act.cost_drivers || [];
        totalCostDrivers += cdList.length;

        // Verify valid quantity & unit on cost drivers
        const validDrivers = cdList.filter((cd) => cd.quantity > 0 && Boolean(cd.unit));
        if (validDrivers.length > 0) {
          activitiesWithCostDrivers++;
        }
      }
    }
  }

  // Calculate coverages
  const outcomeIndicatorCoverage = outcomes.length > 0 ? (outcomes.filter((oc) => oc.indicators && oc.indicators.length > 0).length / outcomes.length) : 0;
  const outputIndicatorCoverage = totalOutputs > 0 ? (outputsWithIndicators / totalOutputs) : 0;
  const costDriverCoverage = totalActivities > 0 ? (activitiesWithCostDrivers / totalActivities) : 0;
  const avgActivitiesPerOutput = totalOutputs > 0 ? (totalActivities / totalOutputs) : 0;

  // Score Component 1: Outcome Layer (20 pts)
  let outcomeScore = 0;
  if (outcomes.length >= 1 && outcomes.length <= 3) {
    outcomeScore = 20;
  } else if (outcomes.length > 0) {
    outcomeScore = 14;
  } else {
    issues.push('Missing outcomes in proposal payload.');
  }

  // Score Component 2: Output Layer (20 pts)
  let outputScore = 0;
  if (totalOutputs >= outcomes.length * 2 && orphanOutputs === 0) {
    outputScore = 20;
  } else if (totalOutputs > 0 && orphanOutputs === 0) {
    outputScore = 14;
  } else {
    issues.push(`Found ${orphanOutputs} orphan outputs or insufficient output density.`);
  }

  // Score Component 3: Activity Layer (20 pts)
  let activityScore = 0;
  if (avgActivitiesPerOutput >= 2.0 && avgActivitiesPerOutput <= 4.0 && orphanActivities === 0) {
    activityScore = 20;
  } else if (avgActivitiesPerOutput >= 1.5 && orphanActivities === 0) {
    activityScore = 14;
  } else {
    issues.push(`Activity density is ${avgActivitiesPerOutput.toFixed(2)} or orphan activities present (${orphanActivities}).`);
  }

  // Score Component 4: Indicator Scaffolding (20 pts)
  let indicatorScore = 0;
  if (outcomeIndicatorCoverage >= 0.90 && outputIndicatorCoverage >= 0.90) {
    indicatorScore = 20;
  } else if (outcomeIndicatorCoverage >= 0.70 && outputIndicatorCoverage >= 0.70) {
    indicatorScore = 14;
  } else {
    issues.push(`Indicator coverage is low (Outcome: ${(outcomeIndicatorCoverage * 100).toFixed(1)}%, Output: ${(outputIndicatorCoverage * 100).toFixed(1)}%).`);
  }

  // Score Component 5: Cost Driver Extraction (20 pts)
  let costDriverScore = 0;
  if (costDriverCoverage >= 0.90) {
    costDriverScore = 20;
  } else if (costDriverCoverage >= 0.70) {
    costDriverScore = 14;
  } else {
    issues.push(`Cost driver coverage is low (${(costDriverCoverage * 100).toFixed(1)}%).`);
  }

  const totalScore = outcomeScore + outputScore + activityScore + indicatorScore + costDriverScore;
  const status = totalScore >= 88 ? 'PASS' : totalScore >= 70 ? 'WARNING' : 'FAIL';

  return {
    total_score: totalScore,
    breakdown: {
      outcome_quality_score: outcomeScore,
      output_quality_score: outputScore,
      activity_quality_score: activityScore,
      indicator_quality_score: indicatorScore,
      cost_driver_quality_score: costDriverScore
    },
    metrics: {
      outcome_count: outcomes.length,
      output_count: totalOutputs,
      activity_count: totalActivities,
      outcome_indicator_coverage: outcomeIndicatorCoverage,
      output_indicator_coverage: outputIndicatorCoverage,
      cost_driver_coverage: costDriverCoverage,
      orphan_outputs_count: orphanOutputs,
      orphan_activities_count: orphanActivities
    },
    status,
    issues
  };
}
