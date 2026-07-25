// scripts/backfill_lfa_entries.ts
// Backfills historical LFA projects using raw gw_lfa_documents.matrix JSON.
//
// Target Projects (Strictly hardcoded for safety and idempotency):
//   1. 9a39aaad-f769-4558-a0ba-6d16e11b64d8 (Konservasi Terumbu Karang Wakatobi)
//   2. 0325b207-5a21-4c7c-8fab-64be72286f3c (Pelatihan Pengolahan Limbah Organik Garut)
//   3. 6e5b23dd-fb65-42c0-bba3-de9a86c65463 (Digitalisasi UMKM Perempuan Difabel)
//   4. 36b092e4-5cd2-485f-a3c5-d650d424a835 (Konservasi Terumbu Karang Wakatobi v2)
//   5. 75244b79-b84a-4800-8a7b-45b9622fbf96 (Pencegahan Stunting Posyandu)
//   6. f369deea-55a2-4ede-b571-7ac46c4dc263 (Pelatihan Keterampilan Digital UMKM)

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://uncsvkvkaijzydndyutp.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

/** Strictly hardcoded target project IDs for backfill safety */
export const BACKFILL_TARGET_PROJECT_IDS: string[] = [
  '9a39aaad-f769-4558-a0ba-6d16e11b64d8',
  '0325b207-5a21-4c7c-8fab-64be72286f3c',
  '6e5b23dd-fb65-42c0-bba3-de9a86c65463',
  '36b092e4-5cd2-485f-a3c5-d650d424a835',
  '75244b79-b84a-4800-8a7b-45b9622fbf96',
  'f369deea-55a2-4ede-b571-7ac46c4dc263',
];

export async function runBackfill() {
  await supabase.auth.signInWithPassword({
    email: process.env.E2E_USER_EMAIL || 'info@bisabaik.or.id',
    password: process.env.E2E_USER_PASSWORD || 'metaproject123'
  });

  console.log(`=== STARTING LFA DATA BACKFILL (${BACKFILL_TARGET_PROJECT_IDS.length} TARGET PROJECTS) ===\n`);

  for (const targetLfaProjectId of BACKFILL_TARGET_PROJECT_IDS) {
    console.log(`--------------------------------------------------`);
    console.log(`[Target Project]: ${targetLfaProjectId}`);

    // Fetch project info
    const { data: lfaProj } = await supabase
      .from('lfa_projects')
      .select('id, name, org_id, linked_grant_id')
      .eq('id', targetLfaProjectId)
      .single();

    const projectName = lfaProj?.name || 'LFA Project';
    const grantId = lfaProj?.linked_grant_id || targetLfaProjectId;
    const orgId = lfaProj?.org_id || '5080e47f-b33c-44d7-b76d-a6a244b3198f';

    console.log(`  Name: "${projectName}"`);

    // Fetch GW LFA Document matrix
    const { data: docs } = await supabase
      .from('gw_lfa_documents')
      .select('*')
      .or(`project_id.eq.${targetLfaProjectId},project_id.eq.${grantId}`)
      .eq('is_current', true)
      .order('version', { ascending: false });

    const doc = docs?.[0];
    if (!doc || !doc.matrix) {
      console.warn(`  ⚠️ Skipping: No current gw_lfa_documents matrix found for project ID ${targetLfaProjectId}`);
      continue;
    }

    const result = { matrix: doc.matrix };
    const lfaEntriesToInsert: Array<any> = [];
    let seq = 1;
    const goalId = crypto.randomUUID();

    // 1. Goal
    if (result.matrix.goal) {
      const goalMovRaw = result.matrix.goal.means_of_verification
        || result.matrix.goal.mov
        || (Array.isArray(result.matrix.program_skeleton?.lfa?.goal?.indicators)
            ? result.matrix.program_skeleton.lfa.goal.indicators.map((i: any) => i.mov).filter(Boolean)
            : null);

      lfaEntriesToInsert.push({
        id: goalId,
        project_id: targetLfaProjectId,
        org_id: orgId,
        level: 'goal',
        sequence: seq++,
        parent_id: null,
        description: result.matrix.goal.statement,
        indicator: Array.isArray(result.matrix.goal.indicators)
          ? result.matrix.goal.indicators.map((i: any) => typeof i === 'object' ? (i.statement || i.indicator || JSON.stringify(i)) : String(i)).join('; ')
          : String(result.matrix.goal.indicators || ''),
        means_of_verification: Array.isArray(goalMovRaw)
          ? goalMovRaw.join('; ')
          : String(goalMovRaw || ''),
        assumption: Array.isArray(result.matrix.goal.assumptions)
          ? result.matrix.goal.assumptions.join('; ')
          : String(result.matrix.goal.assumptions || '')
      });
    }

    // 2. Single Purpose/Outcome Consolidation (NORAD/EuropeAid Standard)
    let singlePurpose: any = null;
    if (Array.isArray(result.matrix.outcomes) && result.matrix.outcomes.length > 0) {
      if (result.matrix.outcomes.length === 1) {
        singlePurpose = result.matrix.outcomes[0];
      } else {
        const primary = result.matrix.outcomes[0];
        const allIndicators = result.matrix.outcomes.flatMap((o: any) => Array.isArray(o.indicators) ? o.indicators : [o.indicators]).filter(Boolean);
        const allMovs = result.matrix.outcomes.flatMap((o: any) => Array.isArray(o.means_of_verification) ? o.means_of_verification : [o.means_of_verification]).filter(Boolean);
        const allAssumptions = result.matrix.outcomes.flatMap((o: any) => Array.isArray(o.assumptions) ? o.assumptions : [o.assumptions]).filter(Boolean);

        singlePurpose = {
          statement: primary.statement,
          indicators: allIndicators,
          means_of_verification: allMovs,
          assumptions: allAssumptions
        };
      }
    } else if (result.matrix.program_skeleton?.lfa?.purpose?.statement) {
      const p = result.matrix.program_skeleton.lfa.purpose;
      singlePurpose = {
        statement: p.statement,
        indicators: Array.isArray(p.indicators) ? p.indicators.map((i: any) => typeof i === 'object' ? i.statement : i) : [p.indicators],
        means_of_verification: Array.isArray(p.indicators) ? p.indicators.map((i: any) => typeof i === 'object' ? i.mov : null).filter(Boolean) : [],
        assumptions: p.assumptions || []
      };
    }

    const singlePurposeId = crypto.randomUUID();
    if (singlePurpose) {
      lfaEntriesToInsert.push({
        id: singlePurposeId,
        project_id: targetLfaProjectId,
        org_id: orgId,
        level: 'purpose',
        sequence: seq++,
        parent_id: goalId,
        description: singlePurpose.statement,
        indicator: Array.isArray(singlePurpose.indicators) ? singlePurpose.indicators.join('; ') : String(singlePurpose.indicators || ''),
        means_of_verification: Array.isArray(singlePurpose.means_of_verification) ? singlePurpose.means_of_verification.join('; ') : String(singlePurpose.means_of_verification || ''),
        assumption: Array.isArray(singlePurpose.assumptions) ? singlePurpose.assumptions.join('; ') : String(singlePurpose.assumptions || '')
      });
    }

    // 3. Outputs
    const outputIdMap = new Map<number, string>();
    if (Array.isArray(result.matrix.outputs)) {
      result.matrix.outputs.forEach((op: any, idx: number) => {
        const opId = crypto.randomUUID();
        outputIdMap.set(idx, opId);
        lfaEntriesToInsert.push({
          id: opId,
          project_id: targetLfaProjectId,
          org_id: orgId,
          level: 'output',
          sequence: seq++,
          parent_id: singlePurposeId,
          description: op.statement,
          indicator: Array.isArray(op.indicators) ? op.indicators.join('; ') : String(op.indicators || ''),
          means_of_verification: Array.isArray(op.means_of_verification) ? op.means_of_verification.join('; ') : String(op.means_of_verification || ''),
          assumption: Array.isArray(op.assumptions) ? op.assumptions.join('; ') : String(op.assumptions || '')
        });
      });
    }

    // 4. Activities
    if (Array.isArray(result.matrix.activities)) {
      const skeletonTasks = result.matrix.program_skeleton?.wbs?.tasks || [];
      const skeletonOutputs = result.matrix.program_skeleton?.lfa?.outputs || [];
      const skeletonActivities = skeletonOutputs.flatMap((op: any) => op.activities || []);

      result.matrix.activities.forEach((act: any, idx: number) => {
        const actId = crypto.randomUUID();
        const firstOutputId = outputIdMap.get(0) || goalId;
        const parentOutputId = outputIdMap.get(act.output_index ?? 0) || firstOutputId;

        const matchingSkeletonAct = skeletonActivities[idx] || skeletonTasks[idx] || {};

        const actIndicatorRaw = act.indicator
          || act.indicators
          || act.deliverable
          || matchingSkeletonAct.indicator
          || matchingSkeletonAct.deliverable;

        const actMovRaw = act.means_of_verification
          || act.mov
          || matchingSkeletonAct.means_of_verification
          || matchingSkeletonAct.mov;

        const actAssumptionRaw = act.assumption
          || act.assumptions
          || matchingSkeletonAct.assumption
          || matchingSkeletonAct.assumptions;

        lfaEntriesToInsert.push({
          id: actId,
          project_id: targetLfaProjectId,
          org_id: orgId,
          level: 'activity',
          sequence: seq++,
          parent_id: parentOutputId,
          description: act.statement || act.title || act.description,
          indicator: Array.isArray(actIndicatorRaw) ? actIndicatorRaw.join('; ') : String(actIndicatorRaw || ''),
          means_of_verification: Array.isArray(actMovRaw) ? actMovRaw.join('; ') : String(actMovRaw || ''),
          assumption: Array.isArray(actAssumptionRaw) ? actAssumptionRaw.join('; ') : String(actAssumptionRaw || ''),
          responsible_party: act.responsible || act.responsibleRole || matchingSkeletonAct.responsibleRole || 'Project Team'
        });
      });
    }

    // Atomic & Idempotent Transactional Materialization
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('materialize_lfa_matrix_transactional', {
      p_project_id: targetLfaProjectId,
      p_entries: lfaEntriesToInsert
    });

    if (rpcErr) {
      console.error(`  ❌ Failed backfill for ${targetLfaProjectId}:`, rpcErr);
    } else {
      console.log(`  ✅ Backfilled successfully (${lfaEntriesToInsert.length} entries materialized). RPC Result:`, rpcRes);
    }
  }

  console.log(`\n=== BACKFILL PROCESS COMPLETED FOR ALL TARGET PROJECTS ===`);
}

runBackfill().catch(console.error);
