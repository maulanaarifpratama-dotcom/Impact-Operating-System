import type { Page1Input, CanonicalCandidate } from './types';
import type { BlueprintItem, ProgramBlueprint } from './blueprint-types';
import { BLUEPRINT_TEMPLATES, BLUEPRINT_FALLBACKS } from './blueprint-config';

export function assembleBlueprint(
  input: Page1Input,
  candidates: CanonicalCandidate[]
): ProgramBlueprint {
  const findByType = (type: CanonicalCandidate['candidateType']) =>
    candidates.filter(c => c.candidateType === type);

  const evidenceText = (set: CanonicalCandidate[]): string | undefined => {
    for (const item of set) {
      for (const span of item.rawEvidenceSpans) {
        if (span.matchedText.trim().length > 0) {
          return span.matchedText.trim();
        }
      }
    }
    return undefined;
  };

  const provenanceFromCandidates = (set: CanonicalCandidate[]): string[] => {
    const refs = new Set<string>();
    for (const item of set) {
      refs.add(`candidate:${item.canonicalId}`);
      for (const span of item.rawEvidenceSpans) {
        refs.add(`span:${span.sourceField}:${span.startOffset}:${span.endOffset}:${span.signalType}`);
      }
    }
    return Array.from(refs);
  };

  const toSlot = (
    id: string,
    section: BlueprintItem['section'],
    template: string,
    placeholder: string,
    slotCandidates: CanonicalCandidate[],
    missingRef: string,
    options?: { requiresLocation?: boolean; requiresActor?: boolean; requiresObjectOfChange?: boolean }
  ): BlueprintItem => {
    const rawText = evidenceText(slotCandidates);
    const locationRaw = input.location?.trim();
    const hasLocation = !!locationRaw && locationRaw.toLowerCase() !== 'unknown';
    const hasActor = findByType('actor').some(c => c.rawEvidenceSpans.length > 0);
    const hasObjectOfChange = slotCandidates.some(c => c.rawEvidenceSpans.some(s => s.matchedText.trim().split(/\s+/).length >= 2));

    const missingReferences: string[] = [];
    if (!rawText) missingReferences.push(missingRef);
    if (options?.requiresLocation && !hasLocation) missingReferences.push('MISS-002');
    if (options?.requiresActor && !hasActor) missingReferences.push('MISS-006');
    if (options?.requiresObjectOfChange && !hasObjectOfChange) missingReferences.push('MISS-008');

    if (missingReferences.length > 0) {
      return {
        id,
        section,
        status: 'unresolved',
        approvable: false,
        unresolvedReason: BLUEPRINT_FALLBACKS.UNRESOLVED_UI_MARKER,
        missingReferences,
        evidenceSpans: slotCandidates.flatMap(c => c.rawEvidenceSpans),
        provenance: provenanceFromCandidates(slotCandidates).length > 0
          ? provenanceFromCandidates(slotCandidates)
          : ['metadata_unavailable']
      };
    }

    return {
      id,
      section,
      text: template.replace(placeholder, rawText ?? ''),
      status: 'from_source',
      approvable: true,
      evidenceSpans: slotCandidates.flatMap(c => c.rawEvidenceSpans),
      provenance: provenanceFromCandidates(slotCandidates)
    };
  };

  const items: BlueprintItem[] = [];

  items.push(toSlot('SLOT-PROBLEM-01', 'problem', BLUEPRINT_TEMPLATES.problem, '[PROBLEM_EVIDENCE]', findByType('problem'), 'MISS-007', { requiresLocation: true }));
  const impactCandidates = candidates.filter(c => c.canonicalId.startsWith('IMP-') || c.canonicalId.startsWith('IMPACT-'));
  items.push(toSlot('SLOT-IMPACT-01', 'impact', BLUEPRINT_TEMPLATES.impact, '[IMPACT_EVIDENCE]', impactCandidates, 'MISS-009', { requiresActor: true, requiresObjectOfChange: true }));
  items.push(toSlot('SLOT-OUTCOME-01', 'outcome', BLUEPRINT_TEMPLATES.outcome, '[OUTCOME_EVIDENCE]', findByType('outcome'), 'MISS-008', { requiresActor: true, requiresObjectOfChange: true }));
  items.push(toSlot('SLOT-OUTPUT-01', 'output', BLUEPRINT_TEMPLATES.output, '[OUTPUT_EVIDENCE]', findByType('output'), 'MISS-011'));
  items.push(toSlot('SLOT-ACTIVITY-01', 'activity', BLUEPRINT_TEMPLATES.activity, '[ACTIVITY_EVIDENCE]', findByType('archetype'), 'MISS-012', { requiresLocation: true }));

  return { items };
}
