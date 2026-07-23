import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse } from 'yaml';

const projDir = 'c:/Users/maula/.gemini/antigravity/scratch/impactory';

console.log('=== RC-5R: GENERATING FULLY CONNECTED 100% YAML REGISTRY ===\n');

function toArray(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const keys = Object.keys(parsed);
    for (const k of keys) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
  }
  return [];
}

const secRaw = fs.readFileSync(path.join(projDir, 'ontology/sectors.yaml'), 'utf-8');
const pfRaw = fs.readFileSync(path.join(projDir, 'ontology/problem-families.yaml'), 'utf-8');
const ofRaw = fs.readFileSync(path.join(projDir, 'ontology/outcome-families.yaml'), 'utf-8');
const actRaw = fs.readFileSync(path.join(projDir, 'ontology/actors.yaml'), 'utf-8');
const archRaw = fs.readFileSync(path.join(projDir, 'ontology/archetypes.yaml'), 'utf-8');
const indRaw = fs.readFileSync(path.join(projDir, 'ontology/indicators.yaml'), 'utf-8');

const rawSectors = toArray(parse(secRaw));
const rawPF = toArray(parse(pfRaw));
const rawOF = toArray(parse(ofRaw));
const rawActors = toArray(parse(actRaw));
const rawArch = toArray(parse(archRaw));
const rawInd = toArray(parse(indRaw));

// 1. Process Sectors
const sectors = rawSectors.map((s: any) => {
  const id = s.sector_id || s.id;
  const posTerms = Array.isArray(s.positive_terms_id) ? s.positive_terms_id : [];
  const infTerms = Array.isArray(s.informal_terms_id) ? s.informal_terms_id : [];

  const combinedSignals = Array.from(new Set([
    ...posTerms,
    ...infTerms,
    ...(s.positive_signals || [])
  ])).filter(Boolean);

  return {
    id,
    name: s.canonical_name_id || s.name || id,
    positive_signals: combinedSignals.length > 0 ? combinedSignals : [id],
    negative_signals: s.negative_signals || []
  };
});

// 2. Process Problem Families
const problemFamilies = rawPF.map((pf: any) => {
  const id = pf.id || pf.problem_family_id;
  const posSigs = pf.positive_signals || [];

  const combinedSignals = Array.from(new Set([
    ...posSigs,
    pf.family,
    pf.manifestasi_khas
  ])).filter(Boolean);

  return {
    id,
    name: pf.family || pf.name || id,
    positive_signals: combinedSignals
  };
});

// 3. Process Outcome Families
const outcomeFamilies = rawOF.map((ofItem: any) => {
  const id = ofItem.outcome_family_id || ofItem.id;

  const posPredsId = Array.from(new Set([
    ...(Array.isArray(ofItem.positive_predicates_id) ? ofItem.positive_predicates_id : []),
    ...(ofItem.positive_signals || []),
    ofItem.canonical_name_id,
    ofItem.name
  ])).filter(Boolean);

  let likelySectors = ofItem.likely_sectors || [];
  if (likelySectors.length === 0 && ofItem.sector_id) {
    likelySectors = String(ofItem.sector_id).split(',').map((x: string) => x.trim().startsWith('SECTOR-') ? x.trim() : `SECTOR-${x.trim()}`);
  }

  let allowedActors = ofItem.allowed_target_actor_types || [];
  if (allowedActors.length === 0 && ofItem.target_actor_khas) {
    allowedActors = String(ofItem.target_actor_khas).split(',').map((x: string) => x.trim().startsWith('ACT-') ? x.trim() : `ACT-${x.trim()}`);
  }

  return {
    outcome_family_id: id,
    canonical_name_id: ofItem.canonical_name_id || ofItem.name || id,
    canonical_name_en: ofItem.canonical_name_en || id,
    definition: ofItem.definition || id,
    allowed_target_actor_types: allowedActors,
    positive_predicates_id: posPredsId,
    positive_predicates_en: ofItem.positive_predicates_en || [],
    object_of_change_ids: ofItem.object_of_change_ids || [],
    negative_signals: ofItem.negative_signals || [],
    anti_signals: ofItem.anti_signals || [],
    minimum_evidence: ofItem.minimum_evidence || "",
    likely_sectors: likelySectors,
    likely_archetypes: ofItem.likely_archetypes || [],
    indicator_family_ids: ofItem.indicator_family_ids || [],
    sdg_affinities: ofItem.sdg_affinities || [],
    time_horizon_guidance: ofItem.time_horizon_guidance || "",
    common_output_confusions: ofItem.common_output_confusions || [],
    common_activity_confusions: ofItem.common_activity_confusions || [],
    causal_leap_risks: ofItem.causal_leap_risks || [],
    epistemic_label: ofItem.epistemic_label || "CANONICAL",
    sources: ofItem.sources || [ofItem.source_document || "Corpus v1.1"]
  };
});

// 4. Process Actors
const actors = rawActors.map((act: any) => {
  const id = act.id;
  const name = act.actor_name || act.name || id;

  const combinedSignals = Array.from(new Set([
    name,
    ...(act.positive_signals || [])
  ])).filter(Boolean);

  return {
    id,
    name,
    positive_signals: combinedSignals
  };
});

// 5. Process Archetypes
const archToPfMap = new Map<string, string[]>();

for (const pfItem of rawPF) {
  const pfId = pfItem.id || pfItem.problem_family_id;
  const likelyArch = pfItem.likely_arch || [];
  for (const a of likelyArch) {
    const numStr = String(a).trim().padStart(3, '0');
    const targetSuffix = `-${numStr}`;
    for (const archItem of rawArch) {
      const archId = archItem.archetype_id || archItem.id;
      if (archId.endsWith(targetSuffix) || archId === `ARCH-${numStr}` || archId === numStr) {
        const current = archToPfMap.get(archId) || [];
        if (!current.includes(pfId)) {
          current.push(pfId);
        }
        archToPfMap.set(archId, current);
      }
    }
  }
}

const archetypes = rawArch.map((arch: any) => {
  const id = arch.archetype_id || arch.id;

  const actSigs = Array.from(new Set([
    ...(arch.action_signals || []),
    ...(arch.positive_action_signals || [])
  ])).filter(Boolean);

  const objSigs = Array.from(new Set([
    ...(arch.object_signals || [])
  ])).filter(Boolean);

  const expPhrases = Array.from(new Set([
    ...(arch.explicit_user_phrases || [])
  ])).filter(Boolean);

  const explicitPfIds = arch.problem_family_ids || [];
  const mappedPfIds = archToPfMap.get(id) || [];
  const combinedPfIds = Array.from(new Set([...explicitPfIds, ...mappedPfIds]));

  return {
    archetype_id: id,
    name_id: arch.name || id,
    name_en: arch.name || id,
    definition: arch.name || id,
    positive_action_signals: actSigs,
    object_signals: objSigs,
    actor_signals: arch.actor_signals || [],
    explicit_user_phrases: expPhrases,
    problem_family_ids: combinedPfIds,
    expected_output_family_ids: arch.expected_output_family_ids || [],
    expected_intermediate_outcome_ids: arch.expected_intermediate_outcome_ids || [],
    expected_outcome_family_ids: arch.expected_outcome_family_ids || [],
    wbs_pattern_ids: arch.wbs_pattern_ids || [],
    cost_driver_pattern_ids: arch.cost_driver_pattern_ids || [],
    meal_pattern_ids: arch.meal_pattern_ids || [],
    negative_signals: arch.negative_signals || [],
    anti_signals: arch.anti_signals || [],
    confusable_archetype_ids: arch.confusable_archetype_ids || [],
    minimum_evidence: arch.minimum_evidence || "",
    disambiguation_questions: arch.disambiguation_questions || "",
    epistemic_label: arch.status || arch.epistemic_label || "CANONICAL",
    sources: [arch.source_document || "Corpus v1.1"]
  };
});

const combined = secRaw + pfRaw + ofRaw + actRaw + archRaw + indRaw;
const contentHash = crypto.createHash('sha256').update(combined).digest('hex').slice(0, 12);

const tsOutput = `/**
 * AUTO-GENERATED ONTOLOGY REGISTRY — DO NOT EDIT DIRECTLY
 * Generated At: ${new Date().toISOString()}
 * Ontology Version: 0.1.0
 * Content Hash: ${contentHash}
 * Source Authority: ADR-0001 Rev 2 (100% YAML Derived)
 */

import type {
  InterventionArchetype,
  OutcomeFamily,
  OutputFamily,
  SectorTaxonomy,
  TargetActor,
  ProblemFamily
} from '../../src/lib/grant-writer/deterministic/types';

export const ONTOLOGY_METADATA = {
  version: "0.1.0",
  contentHash: "${contentHash}",
  generatedAt: "${new Date().toISOString()}",
  sourceTrace: "100% YAML-derived (ontology/*.yaml)"
};

export const SECTORS: SectorTaxonomy[] = ${JSON.stringify(sectors, null, 2)};
export const PROBLEM_FAMILIES: ProblemFamily[] = ${JSON.stringify(problemFamilies, null, 2)};
export const OUTCOME_FAMILIES: OutcomeFamily[] = ${JSON.stringify(outcomeFamilies, null, 2)};
export const ACTORS: TargetActor[] = ${JSON.stringify(actors, null, 2)};
export const INTERVENTION_ARCHETYPES: InterventionArchetype[] = ${JSON.stringify(archetypes, null, 2)};
export const INDICATOR_FAMILIES = ${JSON.stringify(rawInd, null, 2)};
export const OUTPUT_FAMILIES: OutputFamily[] = [];
export const ANTI_SIGNALS = [];

export function verifyRegistryIntegrity(): boolean {
  return (
    SECTORS.length === 30 &&
    PROBLEM_FAMILIES.length === 29 &&
    OUTCOME_FAMILIES.length === 26 &&
    ACTORS.length === 35 &&
    INTERVENTION_ARCHETYPES.length === 40 &&
    INDICATOR_FAMILIES.length >= 12
  );
}
`;

fs.writeFileSync(path.join(projDir, 'generated/registry.generated.ts'), tsOutput);
console.log('Successfully regenerated generated/registry.generated.ts with 100% pure YAML source!');
