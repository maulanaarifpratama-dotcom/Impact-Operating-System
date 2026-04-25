import type { Grant, OrgProfile } from './types';

/**
 * Rule-based match score 0-100. Five signals weighted:
 *   sector overlap   .... 30
 *   sdg overlap      .... 30
 *   geography fit    .... 20
 *   stage eligibility ... 15
 *   recency/urgency   ...  5  (open deadline > expired)
 */
export function matchScore(grant: Grant, profile: OrgProfile | null): number {
  if (!profile) return 0;
  const sectorScore = overlapPct(profile.sectors, grant.sectors) * 30;
  const sdgScore = overlapPct(profile.sdgs.map(String), grant.sdgs.map(String)) * 30;
  const geoScore = geoFit(profile.region, grant.geography) * 20;
  const stageScore = grant.eligibleStages.includes(profile.stage) ? 15 : 0;
  const today = new Date();
  const dl = new Date(grant.deadline + 'T23:59:59');
  const recency = dl > today ? 5 : 0;
  return Math.round(sectorScore + sdgScore + geoScore + stageScore + recency);
}

function overlapPct(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((x) => setB.has(x)).length;
  return hits / Math.min(a.length, b.length);
}

function geoFit(region: string, grantGeo: readonly string[]): number {
  if (grantGeo.includes('nasional') || grantGeo.includes('global') || grantGeo.includes('asia_tenggara')) {
    return 1;
  }
  return grantGeo.includes(region) ? 1 : 0.2;
}

export function matchTier(score: number): { label: string; tone: string } {
  if (score >= 70) return { label: 'Sangat cocok', tone: 'bg-success/15 text-success border-success/30' };
  if (score >= 45) return { label: 'Cukup cocok', tone: 'bg-accent/15 text-accent border-accent/30' };
  if (score >= 20) return { label: 'Mungkin cocok', tone: 'bg-warning/15 text-warning border-warning/30' };
  return { label: 'Kurang cocok', tone: 'bg-muted text-muted-foreground border-border' };
}