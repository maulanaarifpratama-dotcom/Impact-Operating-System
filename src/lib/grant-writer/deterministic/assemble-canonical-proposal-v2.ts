/**
 * Canonical Pipeline Assembler (27.5k Brain Engine Specification)
 * Module: assemble-canonical-proposal-v2.ts
 *
 * CORE ARCHITECTURE PRINCIPLE (GW-P1 WAR ROOM):
 * - The 27.5k Brain Engine is the ONTOLOGY INTELLIGENCE & CONTEXT ASSEMBLY LAYER.
 * - Its primary purpose is to BUILD THE CANONICAL CONTEXT OBJECT to FEED GPT-5.5.
 * - The 27.5k Brain DOES NOT REPLACE GPT-5.5 REASONING.
 * - GPT-5.5 is the mandatory reasoning engine that generates Goal, Outcomes, Outputs, Activities, and Indicators.
 * - The deterministic engine extracts ontology candidates, audits structural hierarchy, and evaluates BQS scores.
 */

import { beneficiaryCountOf } from './page1-readers';
import type {
  Page1Input,
  CanonicalProposalPayloadV2,
  CanonicalOutcomeV2
} from './types';

import { collectCandidates } from './candidates';
import { expandOutcomes } from './outcome-expansion';
import { expandOutputs } from './output-expansion';
import { decomposeActivities } from './activity-decomposition';
import {
  scaffoldOutcomeIndicators,
  scaffoldOutputIndicators
} from './indicator-scaffolding';
import { extractCostDrivers } from './cost-driver-extraction';
import { evaluateBQS27K } from './bqs-27k';

export interface PipelineAssemblerOutput {
  proposal: CanonicalProposalPayloadV2;
  metrics: {
    outcomeCount: number;
    outputCount: number;
    activityCount: number;
    indicatorCount: number;
    costDriverCount: number;
    bqs27k: number;
  };
  validation: {
    orphanOutputs: number;
    orphanActivities: number;
    duplicateIds: number;
    status: 'PASS' | 'WARNING' | 'FAIL';
    issues: string[];
  };
}

export function assembleCanonicalProposalV2(
  input: Page1Input
): PipelineAssemblerOutput {
  const issues: string[] = [];

  // Step 1: Collect Candidates from input
  const candidates = collectCandidates(input);

  // Step 2: Expand Outcomes (Layer 1)
  const { outcomes: rawOutcomes } = expandOutcomes(input, candidates);

  // Step 3: Expand Outputs (Layer 2)
  const { outputs: rawOutputs } = expandOutputs(input, rawOutcomes, candidates);

  // Step 4: Decompose Activities (Layer 3)
  const { outputsWithActivities } = decomposeActivities(input, rawOutputs, candidates);

  let totalIndicators = 0;
  let totalCostDrivers = 0;

  // Steps 5, 6, 7: Scaffold Indicators & Extract Cost Drivers (Layers 4 & 5)
  const fullOutcomes: CanonicalOutcomeV2[] = rawOutcomes.map((oc) => {
    // Step 5: Scaffold Outcome Indicators
    const ocIndicators = scaffoldOutcomeIndicators(input, oc);
    totalIndicators += ocIndicators.length;

    const childOutputs = outputsWithActivities
      .filter((op) => op.parent_outcome_id === oc.id)
      .map((op) => {
        // Step 6: Scaffold Output Indicators
        const opIndicators = scaffoldOutputIndicators(input, op);
        totalIndicators += opIndicators.length;

        const childActivities = (op.activities || []).map((act) => {
          // Step 7: Extract Activity Cost Drivers
          const cds = extractCostDrivers(input, act);
          totalCostDrivers += cds.length;
          return {
            ...act,
            cost_drivers: cds
          };
        });

        return {
          ...op,
          indicators: opIndicators,
          activities: childActivities
        };
      });

    return {
      ...oc,
      indicators: ocIndicators,
      outputs: childOutputs
    };
  });

  // Construct Canonical Proposal Contract V2 Payload
  const proposal: CanonicalProposalPayloadV2 = {
    project_id: input.id ? `PROJ-${input.id}` : `PROJ-27K-${Date.now()}`,
    organization_id: input.organization_id || '00000000-0000-4000-a000-000000000000',
    version: 2,
    metadata: {
      title: input.program_title || input.programTitle || 'Untitled Grant Proposal',
      geography: input.location || 'Indonesia',
      duration_months: input.duration_value || input.durationValue || 12,
      beneficiary_count: beneficiaryCountOf(input, 100),
      total_budget_idr: input.funding_amount || input.fundingAmount || 100000000,
      target_donor: input.target_donor || 'Global Fund / CSR 2026',
      donor_standard: 'BQS-27K Standard Specification'
    },
    outcomes: fullOutcomes
  };

  // Step 8: Evaluate BQS-27K Score
  const bqsResult = evaluateBQS27K(proposal);

  // =========================================================================
  // INTERNAL VALIDATION LAYER
  // =========================================================================

  const allOutcomeIds = new Set(fullOutcomes.map((o) => o.id));
  const allOutputIds = new Set<string>();
  const allActivityIds = new Set<string>();

  const seenIds = new Set<string>();
  let duplicateIds = 0;
  let orphanOutputs = 0;
  let orphanActivities = 0;

  for (const oc of fullOutcomes) {
    if (seenIds.has(oc.id)) duplicateIds++;
    else seenIds.add(oc.id);

    for (const ind of oc.indicators) {
      if (seenIds.has(ind.id)) duplicateIds++;
      else seenIds.add(ind.id);
    }

    for (const op of oc.outputs) {
      if (seenIds.has(op.id)) duplicateIds++;
      else seenIds.add(op.id);
      allOutputIds.add(op.id);

      if (!op.parent_outcome_id || !allOutcomeIds.has(op.parent_outcome_id)) {
        orphanOutputs++;
        issues.push(`Orphan Output detected: ${op.id} (${op.output_name})`);
      }

      for (const ind of op.indicators) {
        if (seenIds.has(ind.id)) duplicateIds++;
        else seenIds.add(ind.id);
      }

      for (const act of op.activities) {
        if (seenIds.has(act.id)) duplicateIds++;
        else seenIds.add(act.id);
        allActivityIds.add(act.id);

        if (!act.parent_output_id || !allOutputIds.has(act.parent_output_id)) {
          orphanActivities++;
          issues.push(`Orphan Activity detected: ${act.id} (${act.activity_name})`);
        }

        for (const cd of act.cost_drivers) {
          if (seenIds.has(cd.id)) duplicateIds++;
          else seenIds.add(cd.id);
        }
      }
    }
  }

  if (duplicateIds > 0) {
    issues.push(`Found ${duplicateIds} duplicate node IDs.`);
  }

  /**
   * A story with too few ontology signals expands to nothing. That is the
   * common case, not a rare one, and it used to leave `status: 'FAIL'` with an
   * empty `issues` array — a verdict the interface could not explain and the
   * author could not act on. Say which level came back empty, so the answer is
   * "add what you are missing" rather than "it failed".
   */
  if (fullOutcomes.length === 0) {
    issues.push(
      'No outcome could be derived from the program story. Describe the change ' +
        'you expect for the beneficiaries — not only the activities you plan to run.',
    );
  } else if (allOutputIds.size === 0) {
    issues.push(
      'Outcomes were derived but no outputs. State what the program will deliver ' +
        'that produces those outcomes.',
    );
  } else if (allActivityIds.size === 0) {
    issues.push(
      'Outputs were derived but no activities. Describe the concrete work behind ' +
        'each deliverable.',
    );
  }

  // Determine overall status
  let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  if (duplicateIds > 0 || orphanOutputs > 0 || orphanActivities > 0 || bqsResult.total_score < 70) {
    status = 'FAIL';
    if (bqsResult.total_score < 70 && issues.length === 0) {
      issues.push(
        `Blueprint quality score ${bqsResult.total_score} is below the 70 threshold. ` +
          'The hierarchy is structurally sound but too thin to build a proposal on.',
      );
    }
  } else if (bqsResult.total_score < 88) {
    status = 'WARNING';
  }

  return {
    proposal,
    metrics: {
      outcomeCount: fullOutcomes.length,
      outputCount: bqsResult.metrics.output_count,
      activityCount: bqsResult.metrics.activity_count,
      indicatorCount: totalIndicators,
      costDriverCount: totalCostDrivers,
      bqs27k: bqsResult.total_score
    },
    validation: {
      orphanOutputs,
      orphanActivities,
      duplicateIds,
      status,
      issues
    }
  };
}
