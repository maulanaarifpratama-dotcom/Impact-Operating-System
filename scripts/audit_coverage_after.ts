import {
  SECTORS,
  PROBLEM_FAMILIES,
  OUTCOME_FAMILIES,
  ACTORS,
  INTERVENTION_ARCHETYPES,
  INDICATOR_FAMILIES
} from '../generated/registry.generated.js';

console.log('=== POST-MATERIALIZATION COVERAGE AUDIT ===\n');

const canonical = {
  sectors: 30,
  pf: 29,
  of: 26,
  act: 35,
  arch: 40,
  ind: 12
};

console.log('Category | Canonical Target | Before (Legacy Pass-Through) | After (100% YAML Serialized) | After % | Status');
console.log('---|---|---|---|---|---');

function row(cat: string, target: number, before: number, after: number) {
  const afterPct = ((after / target) * 100).toFixed(1) + '%';
  const status = after === target || (cat === 'Indicators' && after >= target) ? 'PASS' : 'WARN';
  console.log(`${cat} | ${target} | ${before} | ${after} | ${afterPct} | ${status}`);
}

row('Sectors', canonical.sectors, 30, SECTORS.length);
row('Problem Families', canonical.pf, 11, PROBLEM_FAMILIES.length);
row('Outcome Families', canonical.of, 9, OUTCOME_FAMILIES.length);
row('Target Actors', canonical.act, 6, ACTORS.length);
row('Archetypes', canonical.arch, 14, INTERVENTION_ARCHETYPES.length);
row('Indicators', canonical.ind, 0, INDICATOR_FAMILIES.length);
