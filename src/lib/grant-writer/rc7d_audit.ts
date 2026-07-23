import { REGRESSION_FIXTURES } from './deterministic/fixtures';
import { collectCandidates } from './deterministic/candidates';
import { evaluateMethodologyQualityGate } from './deterministic/methodology-gate';
import {
  preprocessEligibility,
  scoreSector,
  scoreSDG,
  processConflictsAndPenalties,
  assignRecommendations,
  runScoringPipeline
} from './deterministic/scoring-runner';
import { SECTORS } from './deterministic/registry';

function runPipelineBeforeAndAfterMQG(input: any) {
  const allCandidates = collectCandidates(input);
  const eligibleCandidates = preprocessEligibility(allCandidates);
  const triggeredConflicts: string[] = [];

  const sectorResults = SECTORS.map(sec => scoreSector(sec.id, eligibleCandidates, input));
  const sdgIds = ['SDG_1', 'SDG_2', 'SDG_3', 'SDG_4', 'SDG_5', 'SDG_6', 'SDG_7', 'SDG_8', 'SDG_9', 'SDG_10', 'SDG_11', 'SDG_12', 'SDG_13', 'SDG_14', 'SDG_15', 'SDG_16', 'SDG_17'];
  const sdgResults = sdgIds.map(id => scoreSDG(id, eligibleCandidates, input));

  const { sectorResults: nextSectors, sdgResults: nextSDGs } = processConflictsAndPenalties(
    allCandidates,
    eligibleCandidates,
    sectorResults,
    sdgResults,
    input,
    triggeredConflicts
  );

  const beforeMQG = assignRecommendations(eligibleCandidates, nextSectors, nextSDGs, input, triggeredConflicts);
  const afterMQG = evaluateMethodologyQualityGate(beforeMQG, eligibleCandidates, input);

  return { beforeMQG, afterMQG };
}

console.log("=================================================================");
console.log("                  RC-7D POST-IMPLEMENTATION AUDIT                 ");
console.log("=================================================================\n");

const goldFixtures = REGRESSION_FIXTURES.filter(f => f.fixture_type === 'gold');
const hnFixtures = REGRESSION_FIXTURES.filter(f => f.fixture_type === 'hard_negative');

console.log(`Loaded ${goldFixtures.length} GOLD fixtures and ${hnFixtures.length} HN fixtures.\n`);

console.log("--- TASK 1: GOLD FIXTURES AUDIT ---");
const goldAudit: any[] = [];
for (const f of goldFixtures) {
  const { beforeMQG, afterMQG } = runPipelineBeforeAndAfterMQG(f.page_1_input);
  goldAudit.push({
    id: f.fixture_id,
    before: beforeMQG.assignmentStatus,
    after: afterMQG.assignmentStatus,
    sectorBefore: beforeMQG.primarySector,
    sectorAfter: afterMQG.primarySector,
    reasonBefore: beforeMQG.assignmentReason,
    reasonAfter: afterMQG.assignmentReason,
    demoted: beforeMQG.assignmentStatus !== afterMQG.assignmentStatus
  });
}
console.table(goldAudit);

console.log("\n--- TASK 2: HARD NEGATIVE FIXTURES AUDIT ---");
const hnAudit: any[] = [];
for (const f of hnFixtures) {
  const { beforeMQG, afterMQG } = runPipelineBeforeAndAfterMQG(f.page_1_input);
  hnAudit.push({
    id: f.fixture_id,
    before: beforeMQG.assignmentStatus,
    after: afterMQG.assignmentStatus,
    sectorBefore: beforeMQG.primarySector,
    sectorAfter: afterMQG.primarySector,
    reasonBefore: beforeMQG.assignmentReason,
    reasonAfter: afterMQG.assignmentReason,
    demoted: beforeMQG.assignmentStatus !== afterMQG.assignmentStatus
  });
}
console.table(hnAudit);

console.log("\n--- TASK 3: AUDIT SPECIFICALLY HN-102, HN-105, HN-111, HN-112 ---");
const targetIds = ['FIX-HN-102', 'FIX-HN-105', 'FIX-HN-111', 'FIX-HN-112'];
for (const tid of targetIds) {
  const f = REGRESSION_FIXTURES.find(x => x.fixture_id === tid);
  if (f) {
    const { beforeMQG, afterMQG } = runPipelineBeforeAndAfterMQG(f.page_1_input);
    console.log(`\n[${tid}]`);
    console.log(`- assignmentStatus before : ${beforeMQG.assignmentStatus}`);
    console.log(`- assignmentStatus after  : ${afterMQG.assignmentStatus}`);
    console.log(`- assignmentReason before : ${beforeMQG.assignmentReason}`);
    console.log(`- assignmentReason after  : ${afterMQG.assignmentReason}`);
    console.log(`- MQG rule fired           : ${afterMQG.assignmentReason.includes('MQG_REJECT_') ? afterMQG.assignmentReason.split(' (')[0] : 'None'}`);
  }
}

console.log("\n--- TASK 4: REGRESSION SWEEP (GOLD FIXTURES) ---");
const goldRegressions = goldAudit.filter(g => g.demoted);
console.log(`GOLD Regressions Count: ${goldRegressions.length}`);
if (goldRegressions.length > 0) {
  console.log("Demoted GOLD Fixtures:", goldRegressions);
} else {
  console.log("Zero GOLD regressions detected! All assigned GOLD fixtures retain their assignment status.");
}

console.log("\n--- TASK 5: RECALCULATE METRICS BEFORE VS AFTER ---");
// Ground truth definition:
// GOLD fixtures are positive (should be ASSIGNED)
// HN fixtures are negative (should NOT be ASSIGNED, i.e., INSUFFICIENT_EVIDENCE or AMBIGUOUS)

let tpBefore = 0, fpBefore = 0, tnBefore = 0, fnBefore = 0;
let tpAfter = 0, fpAfter = 0, tnAfter = 0, fnAfter = 0;

for (const g of goldAudit) {
  if (g.before === 'ASSIGNED') tpBefore++; else fnBefore++;
  if (g.after === 'ASSIGNED') tpAfter++; else fnAfter++;
}

for (const h of hnAudit) {
  if (h.before === 'ASSIGNED') fpBefore++; else tnBefore++;
  if (h.after === 'ASSIGNED') fpAfter++; else tnAfter++;
}

const precBefore = tpBefore / (tpBefore + fpBefore) || 0;
const recallBefore = tpBefore / (tpBefore + fnBefore) || 0;
const specBefore = tnBefore / (tnBefore + fpBefore) || 0;
const fprBefore = fpBefore / (fpBefore + tnBefore) || 0;

const precAfter = tpAfter / (tpAfter + fpAfter) || 0;
const recallAfter = tpAfter / (tpAfter + fnAfter) || 0;
const specAfter = tnAfter / (tnAfter + fpAfter) || 0;
const fprAfter = fpAfter / (fpAfter + tnAfter) || 0;

console.log("\nMETRICS COMPARISON:");
console.log(`- TP / FP / TN / FN Before : TP=${tpBefore}, FP=${fpBefore}, TN=${tnBefore}, FN=${fnBefore}`);
console.log(`- TP / FP / TN / FN After  : TP=${tpAfter}, FP=${fpAfter}, TN=${tnAfter}, FN=${fnAfter}`);
console.log(`- Precision   Before vs After: ${(precBefore*100).toFixed(2)}% -> ${(precAfter*100).toFixed(2)}%`);
console.log(`- Recall      Before vs After: ${(recallBefore*100).toFixed(2)}% -> ${(recallAfter*100).toFixed(2)}%`);
console.log(`- Specificity Before vs After: ${(specBefore*100).toFixed(2)}% -> ${(specAfter*100).toFixed(2)}%`);
console.log(`- FPR         Before vs After: ${(fprBefore*100).toFixed(2)}% -> ${(fprAfter*100).toFixed(2)}%`);

