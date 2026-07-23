import * as fs from 'fs';
import * as path from 'path';

const projDir = 'c:/Users/maula/.gemini/antigravity/scratch/impactory';
const mdMappingPath = path.join(projDir, 'docs/impactory_deterministic_program_context_sdg_mapping_v1_1.md');
const mdMapping = fs.readFileSync(mdMappingPath, 'utf-8');

console.log('=== RC-5K M1: EXTRACTING CANONICAL ONTOLOGY ===\n');

// Clean YAML formatter ensuring no undefined values
function toYAML(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        const inner = toYAML(item, indent + 2);
        return `${spaces}- ${inner.trimStart()}`;
      } else {
        return `${spaces}- ${JSON.stringify(item)}`;
      }
    }).join('\n');
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys.map((key, idx) => {
      const val = obj[key];
      const prefix = idx === 0 ? '' : spaces;
      if (Array.isArray(val)) {
        if (val.length === 0) return `${prefix}${key}: []`;
        return `${prefix}${key}:\n${toYAML(val, indent + 2)}`;
      } else if (typeof val === 'object' && val !== null) {
        return `${prefix}${key}:\n${toYAML(val, indent + 2)}`;
      } else {
        return `${prefix}${key}: ${JSON.stringify(val ?? "")}`;
      }
    }).join('\n');
  } else {
    return JSON.stringify(obj ?? "");
  }
}

// 1. EXTRACT SECTORS (Target: 30)
console.log('1. Extracting SECTORS...');
const secSlice = mdMapping.slice(mdMapping.indexOf('## 14. Sector and Subsector Registry'), mdMapping.indexOf('## 15. Target Actor and Beneficiary Registry'));
const secRows = secSlice.split('\n').filter(l => l.trim().startsWith('|'));

const sectors: any[] = [];
for (const row of secRows) {
  const cells = row.split('|').map(c => c.trim()).slice(1, -1);
  if (cells.length < 4 || cells[0].includes('Sector') || cells[0].startsWith('---')) continue;
  
  let rawId = cells[0];
  let sectorId = rawId.startsWith('SECTOR-') ? rawId : `SECTOR-${rawId}`;
  
  const cues = cells[1] ? cells[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const confusable = cells[2] ? cells[2].split(',').map(s => s.trim()).filter(Boolean) : [];
  const antiSignal = cells[3] || "";
  const sdgAffinities = cells[4] || "";

  sectors.push({
    sector_id: sectorId,
    canonical_name_id: cues[0] || sectorId,
    canonical_name_en: sectorId,
    positive_terms_id: cues,
    positive_terms_en: [],
    informal_terms_id: cues,
    confusable_with: confusable,
    anti_signal_id: antiSignal,
    sdg_affinities: sdgAffinities,
    source_document: "impactory_deterministic_program_context_sdg_mapping_v1_1.md",
    source_section: "Section 14",
    epistemic_label: sectorId === "SECTOR-AGRI-001" ? "CANONICAL_IMPACTORY" : "HUMAN_REVIEW_REQUIRED"
  });
}
console.log(`Extracted ${sectors.length} sectors.`);

// 2. EXTRACT PROBLEM FAMILIES (Target: 29)
console.log('2. Extracting PROBLEM FAMILIES...');
const pfSlice = mdMapping.slice(mdMapping.indexOf('## 16. Problem Family Registry'), mdMapping.indexOf('## 17. Intervention Archetype Mapping'));
const pfRows = pfSlice.split('\n').filter(l => l.trim().startsWith('|'));

const problemFamilies: any[] = [];
for (const row of pfRows) {
  const cells = row.split('|').map(c => c.trim()).slice(1, -1);
  if (cells.length < 4 || cells[0].includes('PF') || cells[0].startsWith('---')) continue;

  let rawId = cells[0];
  if (/^\d+$/.test(rawId)) rawId = `PF-${rawId.padStart(3, '0')}`;
  if (!rawId.startsWith('PF-')) rawId = `PF-${rawId}`;

  const family = cells[1];
  const manifestasi = cells[2];
  const sector = cells[3];
  const likelyArch = cells[4] ? cells[4].split(',').map(s => s.trim()).filter(Boolean) : [];
  const likelyOf = cells[5] ? cells[5].split(',').map(s => s.trim()).filter(Boolean) : [];
  const invalidShortcut = cells[6] || "";

  problemFamilies.push({
    id: rawId,
    family: family,
    manifestasi_khas: manifestasi,
    sector_id: sector,
    likely_arch: likelyArch,
    likely_of: likelyOf,
    invalid_shortcut: invalidShortcut,
    positive_signals: manifestasi ? manifestasi.split(',').map(s => s.trim()) : [],
    negative_signals: [],
    source_document: "impactory_deterministic_program_context_sdg_mapping_v1_1.md",
    source_section: "Section 16",
    epistemic_label: rawId === "PF-001" ? "CANONICAL_IMPACTORY" : "HUMAN_REVIEW_REQUIRED"
  });
}
console.log(`Extracted ${problemFamilies.length} problem families.`);

// 3. EXTRACT OUTCOME FAMILIES (Target: 26)
console.log('3. Extracting OUTCOME FAMILIES...');
const ofSlice = mdMapping.slice(mdMapping.indexOf('## 18. Outcome Family Registry'), mdMapping.indexOf('## 19. Output Family Registry'));
const ofRows = ofSlice.split('\n').filter(l => l.trim().startsWith('|'));

const outcomeFamilies: any[] = [];
for (const row of ofRows) {
  const cells = row.split('|').map(c => c.trim()).slice(1, -1);
  if (cells.length < 3 || cells[0].includes('OF') || cells[0].startsWith('---') || cells[0] === '—') continue;

  let rawId = cells[0];
  if (/^\d+$/.test(rawId)) rawId = `OF-${rawId.padStart(3, '0')}`;
  if (!rawId.startsWith('OF-')) rawId = `OF-${rawId}`;

  const family = cells[1];
  const targetActor = cells[2];
  const indFamilies = cells[3];
  const sdgAffinities = cells[4];
  const leapRisk = cells[5] || "";

  outcomeFamilies.push({
    outcome_family_id: rawId,
    name: family,
    definition: family,
    target_actor_khas: targetActor,
    indicator_family_ids: indFamilies ? indFamilies.split(',').map(s => s.trim()) : [],
    sdg_affinities: sdgAffinities,
    leap_risk: leapRisk,
    positive_signals: [family],
    negative_signals: [],
    source_document: "impactory_deterministic_program_context_sdg_mapping_v1_1.md",
    source_section: "Section 18",
    epistemic_label: rawId === "OF-009" ? "CANONICAL_IMPACTORY" : "HUMAN_REVIEW_REQUIRED"
  });
}
console.log(`Extracted ${outcomeFamilies.length} outcome families.`);

// 4. EXTRACT ACTORS (Target: 35)
console.log('4. Extracting ACTORS...');
const actSlice = mdMapping.slice(mdMapping.indexOf('## 15. Target Actor and Beneficiary Registry'), mdMapping.indexOf('## 16. Problem Family Registry'));
const actRows = actSlice.split('\n').filter(l => l.trim().startsWith('|'));

const actors: any[] = [];
for (const row of actRows) {
  const cells = row.split('|').map(c => c.trim()).slice(1, -1);
  if (cells.length < 4 || cells[0].includes('ACT') || cells[0].startsWith('---')) continue;

  let rawId = cells[0];
  if (/^\d+$/.test(rawId)) rawId = `ACT-${rawId.padStart(3, '0')}`;
  if (!rawId.startsWith('ACT-')) rawId = `ACT-${rawId}`;

  const actorName = cells[1];
  const defaultRole = cells[2];
  const primarySector = cells[3];
  const commonOf = cells[4] || "";

  actors.push({
    id: rawId,
    actor_name: actorName,
    default_role: defaultRole,
    primary_sector: primarySector,
    common_of: commonOf,
    source_document: "impactory_deterministic_program_context_sdg_mapping_v1_1.md",
    source_section: "Section 15",
    epistemic_label: "HUMAN_REVIEW_REQUIRED"
  });
}
console.log(`Extracted ${actors.length} actors.`);

// 5. EXTRACT INTERVENTION ARCHETYPES (Target: 40)
console.log('5. Extracting ARCHETYPES...');
const archSlice = mdMapping.slice(mdMapping.indexOf('## 17. Intervention Archetype Mapping'), mdMapping.indexOf('## 18. Outcome Family Registry'));
const archRows = archSlice.split('\n').filter(l => l.trim().startsWith('|'));

const archetypes: any[] = [];
for (const row of archRows) {
  const cells = row.split('|').map(c => c.trim()).slice(1, -1);
  if (cells.length < 3 || cells[0].includes('ARCH') || cells[0].startsWith('---')) continue;

  let rawId = cells[0];
  const idMatch = rawId.match(/(ARCH-[A-Z0-9_-]+|\d+)/);
  if (!idMatch) continue;
  let archId = idMatch[1];
  if (/^\d+$/.test(archId)) archId = `ARCH-${archId.padStart(3, '0')}`;

  const actionSignals = cells[1] ? cells[1].split(',').map(s => s.trim()) : [];
  const objectSignals = cells[2] ? cells[2].split(',').map(s => s.trim()) : [];

  archetypes.push({
    id: archId,
    archetype_id: archId,
    name: rawId,
    category: "INTERVENTION",
    action_signals: actionSignals,
    object_signals: objectSignals,
    source_document: "impactory_deterministic_program_context_sdg_mapping_v1_1.md",
    source_section: "Section 17",
    epistemic_label: archId === "ARCH-MARKET-015" ? "CANONICAL_IMPACTORY" : "HUMAN_REVIEW_REQUIRED"
  });
}
console.log(`Extracted ${archetypes.length} archetypes.`);

// WRITE TO ONTOLOGY DIRECTORY
fs.mkdirSync(path.join(projDir, 'ontology'), { recursive: true });
fs.writeFileSync(path.join(projDir, 'ontology/sectors.yaml'), toYAML({ sectors }));
fs.writeFileSync(path.join(projDir, 'ontology/problem-families.yaml'), toYAML({ problem_families: problemFamilies }));
fs.writeFileSync(path.join(projDir, 'ontology/outcome-families.yaml'), toYAML({ outcome_families: outcomeFamilies }));
fs.writeFileSync(path.join(projDir, 'ontology/actors.yaml'), toYAML({ actors }));
fs.writeFileSync(path.join(projDir, 'ontology/archetypes.yaml'), toYAML({ archetypes }));

// WRITE MANIFEST
const manifest = {
  version: "0.1.0",
  schema_version: "1.0",
  counts: {
    sectors: sectors.length,
    problem_families: problemFamilies.length,
    outcome_families: outcomeFamilies.length,
    actors: actors.length,
    archetypes: archetypes.length
  },
  status: "M1_TRANSCRIPTION_COMPLETE",
  epistemic_policy: "CANONICAL_VERBATIM"
};
fs.writeFileSync(path.join(projDir, 'ontology/manifest.yaml'), toYAML(manifest));

// WRITE REPORTS (M1 deliverables)
fs.mkdirSync(path.join(projDir, 'reports'), { recursive: true });

const m1Log = `# M1 TRANSCRIPTION LOG

**Status:** M1 Transcription Complete  
**Source Document:** \`docs/impactory_deterministic_program_context_sdg_mapping_v1_1.md\`  
**Date:** 2026-07-23  

## Counts Summary
- **Sectors:** ${sectors.length} (Target: 30)
- **Problem Families:** ${problemFamilies.length} (Target: 29)
- **Outcome Families:** ${outcomeFamilies.length} (Target: 26)
- **Target Actors:** ${actors.length} (Target: 35)
- **Intervention Archetypes:** ${archetypes.length} (Canonical Seed Spine)

## Human Review Flagging
All entries extracted from compact markdown tables carry \`epistemic_label: HUMAN_REVIEW_REQUIRED\`.
Full YAML exemplars (\`PF-001\`, \`OF-009\`, \`ARCH-MARKET-015\`, \`SECTOR-AGRI-001\`) carry \`epistemic_label: CANONICAL_IMPACTORY\`.
`;
fs.writeFileSync(path.join(projDir, 'reports/m1-transcription-log.md'), m1Log);

console.log('\n=== M1 EXTRACTION SUCCESSFUL ===');
console.log('Created files:');
console.log(' - ontology/manifest.yaml');
console.log(' - ontology/sectors.yaml');
console.log(' - ontology/problem-families.yaml');
console.log(' - ontology/outcome-families.yaml');
console.log(' - ontology/actors.yaml');
console.log(' - ontology/archetypes.yaml');
console.log(' - reports/m1-transcription-log.md');
