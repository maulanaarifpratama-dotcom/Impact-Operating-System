import { describe, test, expect } from 'vitest';
import {
  adaptProvisionalResponse,
  PROVISIONAL_FIXTURES
} from './provisionalAdapter';

describe('Provisional Adapter Spec v1.2 Tests', () => {
  test('should parse and normalize High Confidence scenario correctly with v1.2 extensions', () => {
    const adapted = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']);
    
    expect(adapted.contractVersion).toBe('1.2');
    expect(adapted.contractStatus).toBe('provisional_against_v1_2');
    expect(adapted.sectors).toHaveLength(2);
    expect(adapted.sectors[0].id).toBe('SEC-ECON');
    expect(adapted.sectors[0].level).toBe('primary');
    expect(adapted.sectors[0].confidence).toBe('high');
    expect(adapted.sectors[0].confidenceScore).toBe(0.95);
    expect(adapted.sectors[0].evidence?.sourceField).toBe('programStory');
    expect(adapted.sectors[0].evidenceSpans).toHaveLength(2);
    expect(adapted.sectors[0].evidenceSpans?.[0].text).toBe('pelatihan pertanian berkelanjutan bagi 50 petani kecil');
    expect(adapted.sectors[0].evidenceSpans?.[1].text).toBe('menaikkan pendapatan petani rata-rata 30%');
    
    expect(adapted.interventions).toHaveLength(2);
    expect(adapted.interventions[0].id).toBe('ARCH-TRAINING-001');
    expect(adapted.interventions[0].level).toBe('primary');
    expect(adapted.interventions[0].confidenceScore).toBe(0.92);
    
    expect(adapted.sdgs).toHaveLength(3);
    expect(adapted.sdgs[0].num).toBe(1);
    expect(adapted.sdgs[0].level).toBe('primary');
    expect(adapted.sdgs[0].confidenceScore).toBe(0.94);

    // SDG 5 has level 'rejected'
    expect(adapted.sdgs[2].num).toBe(5);
    expect(adapted.sdgs[2].level).toBe('rejected');
    expect(adapted.sdgs[2].confidenceScore).toBe(0.15);
    
    expect(adapted.actorRoles).toHaveLength(2);
    expect(adapted.actorRoles[0].role).toBe('beneficiary');
    expect(adapted.actorRoles[0].confidenceScore).toBe(0.97);
    expect(adapted.actorRoles[1].role).toBe('target_actor');
  });

  test('should parse and preserve Sector Ambiguity scenario', () => {
    const adapted = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-SA-2']);
    
    expect(adapted.sectors[0].level).toBe('ambiguous');
    expect(adapted.ambiguities).toHaveLength(1);
    expect(adapted.ambiguities[0].id).toBe('AMB-SEC-1');
    expect(adapted.ambiguities[0].field).toBe('sector');
    expect(adapted.ambiguities[0].candidates).toContain('Pemberdayaan Ekonomi');
    expect(adapted.ambiguities[0].candidates).toContain('Pangan & Pertanian');
  });

  test('should parse Actor Role Distinction scenario correctly', () => {
    const adapted = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-AR-3']);
    
    expect(adapted.actorRoles).toHaveLength(3);
    const roles = adapted.actorRoles.map(a => a.role);
    expect(roles).toContain('rights_holder');
    expect(roles).toContain('target_actor');
    expect(roles).toContain('institutional_actor');
  });

  test('should identify blocking warnings and questions in Scope Too Broad scenario', () => {
    const adapted = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-SB-4']);
    
    expect(adapted.missingInformation).toHaveLength(1);
    expect(adapted.missingInformation[0].id).toBe('MISS-SB-1');
    expect(adapted.missingInformation[0].blocking).toBe(true);
    expect(adapted.missingInformation[0].requiredForApproval).toBe(true);
    
    expect(adapted.warnings).toHaveLength(2);
    const severities = adapted.warnings.map(w => w.severity);
    expect(severities).toContain('important');
    expect(severities).toContain('blocking');
  });

  test('should throw error for invalid contract version', () => {
    const invalidRaw = {
      contractVersion: '1.1',
      sectors: []
    };
    
    expect(() => adaptProvisionalResponse(invalidRaw)).toThrowError(/Unsupported contract version/);
  });

  test('should capture unknown additive fields into passthrough', () => {
    const rawWithExtra = {
      contractVersion: '1.2',
      engineVersion: 'det-engine-v1.0',
      registryVersions: {},
      sectors: [],
      someExtraSecretKey: 'highlySecretValue',
      anotherCustomConfig: { nested: true }
    };
    const adapted = adaptProvisionalResponse(rawWithExtra);
    expect(adapted.passthrough).toBeDefined();
    expect(adapted.passthrough?.someExtraSecretKey).toBe('highlySecretValue');
    expect(adapted.passthrough?.anotherCustomConfig?.nested).toBe(true);
  });

  test('safety: rawCanonicalPayload is preserved, complete, and unmutated', () => {
    const raw = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', customField: 'lossless' }]
    };
    const adapted = adaptProvisionalResponse(raw);
    expect(adapted.rawCanonicalPayload).toBeDefined();
    expect(Object.isFrozen(adapted.rawCanonicalPayload)).toBe(true);
    // Unrecognized nested fields are not stripped from rawCanonicalPayload
    expect((adapted.rawCanonicalPayload.sectors as unknown as Record<string, unknown>[])[0].customField).toBe('lossless');
  });

  test('safety: unknown future actor roles are excluded from normalized view but preserved in raw payload', () => {
    const raw = {
      contractVersion: '1.2',
      actorRoles: [{ id: 'ACT-NEW', actorName: 'New Role Actor', role: 'unknown_future_role' }]
    };
    const adapted = adaptProvisionalResponse(raw);
    expect(adapted.actorRoles[0].role).toBeUndefined();
    expect((adapted.rawCanonicalPayload.actorRoles as unknown as Record<string, unknown>[])[0].role).toBe('unknown_future_role');
    expect(adapted.adapterValidationIssues).toHaveLength(1);
    expect(adapted.adapterValidationIssues?.[0].code).toBe('VAL-ACTOR-ROLE');
  });

  test('safety: confidenceScore validation bounds and edge cases', () => {
    // confidence 0
    const rawZero = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: 0 }]
    };
    const adaptedZero = adaptProvisionalResponse(rawZero);
    expect(adaptedZero.sectors[0].confidenceScore).toBe(0);
    expect(adaptedZero.adapterValidationIssues).toBeUndefined();

    // confidence 1
    const rawOne = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: 1 }]
    };
    const adaptedOne = adaptProvisionalResponse(rawOne);
    expect(adaptedOne.sectors[0].confidenceScore).toBe(1);
    expect(adaptedOne.adapterValidationIssues).toBeUndefined();

    // confidence intermediate 0.5
    const rawMid = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: 0.5 }]
    };
    const adaptedMid = adaptProvisionalResponse(rawMid);
    expect(adaptedMid.sectors[0].confidenceScore).toBe(0.5);
    expect(adaptedMid.adapterValidationIssues).toBeUndefined();

    // invalid: negative, >1, NaN, Infinity
    const rawNegative = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: -0.01 }]
    };
    const adaptedNeg = adaptProvisionalResponse(rawNegative);
    expect(adaptedNeg.sectors[0].confidenceScore).toBeUndefined();
    expect(adaptedNeg.adapterValidationIssues).toHaveLength(1);
    expect(adaptedNeg.adapterValidationIssues?.[0].code).toBe('VAL-CONFIDENCE');

    const rawOver = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: 1.01 }]
    };
    const adaptedOver = adaptProvisionalResponse(rawOver);
    expect(adaptedOver.sectors[0].confidenceScore).toBeUndefined();
    expect(adaptedOver.adapterValidationIssues).toHaveLength(1);

    const rawNaN = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: NaN }]
    };
    const adaptedNaN = adaptProvisionalResponse(rawNaN);
    expect(adaptedNaN.sectors[0].confidenceScore).toBeUndefined();
    expect(adaptedNaN.adapterValidationIssues).toHaveLength(1);

    const rawInfinity = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: Infinity }]
    };
    const adaptedInf = adaptProvisionalResponse(rawInfinity);
    expect(adaptedInf.sectors[0].confidenceScore).toBeUndefined();
    expect(adaptedInf.adapterValidationIssues).toHaveLength(1);

    const rawNonNumeric = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1', confidenceScore: 'high-score' as unknown as number }]
    };
    const adaptedNonNum = adaptProvisionalResponse(rawNonNumeric);
    expect(adaptedNonNum.sectors[0].confidenceScore).toBeUndefined();
    expect(adaptedNonNum.adapterValidationIssues).toHaveLength(1);
  });

  test('safety: evidence spans offsets validation and ordering', () => {
    const rawSpans = {
      contractVersion: '1.2',
      sectors: [{
        id: 'SEC-1',
        label: 'Sector 1',
        evidenceSpans: [
          { sourceField: 'programStory', text: 'valid-1', startOffset: 0, endOffset: 5 },
          { sourceField: 'programStory', text: 'invalid-2', startOffset: 10, endOffset: 5 },
          { sourceField: 'programStory', text: 'valid-3', startOffset: 10, endOffset: 20 }
        ]
      }]
    };
    const adapted = adaptProvisionalResponse(rawSpans);
    // Invalid span excluded from projection, valid ones remain and preserve order
    expect(adapted.sectors[0].evidenceSpans).toHaveLength(2);
    expect(adapted.sectors[0].evidenceSpans?.[0].text).toBe('valid-1');
    expect(adapted.sectors[0].evidenceSpans?.[1].text).toBe('valid-3');

    // Invalid span remains in raw canonical payload
    const rawSectors = adapted.rawCanonicalPayload.sectors as unknown as Record<string, unknown>[];
    const rawEvidenceSpans = rawSectors[0].evidenceSpans as Record<string, unknown>[];
    expect(rawEvidenceSpans).toHaveLength(3);
    expect(rawEvidenceSpans[1].text).toBe('invalid-2');

    // Creates adapter issues, no canonical warnings
    expect(adapted.adapterValidationIssues).toHaveLength(1);
    expect(adapted.adapterValidationIssues?.[0].code).toBe('VAL-EVIDENCE-OFFSETS');
    expect(adapted.warnings).toHaveLength(0);
  });

  test('safety: source-input mutation isolation', () => {
    const raw = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1' }]
    };
    const adapted = adaptProvisionalResponse(raw);
    // Mutate the original source input
    raw.sectors[0].label = 'Mutated Sector';

    // Adapted raw payload remains unmutated
    const rawSectors = adapted.rawCanonicalPayload.sectors as unknown as Record<string, unknown>[];
    expect(rawSectors[0].label).toBe('Sector 1');
  });

  test('safety: nested mutation isolation / freeze', () => {
    const raw = {
      contractVersion: '1.2',
      sectors: [{ id: 'SEC-1', label: 'Sector 1' }]
    };
    const adapted = adaptProvisionalResponse(raw);
    expect(Object.isFrozen(adapted.rawCanonicalPayload)).toBe(true);

    // Attempting to mutate a top-level property of rawCanonicalPayload should throw in strict mode
    expect(() => {
      (adapted.rawCanonicalPayload as Record<string, unknown>).newProp = 'illegal';
    }).toThrow();
  });

  test('safety: null/absent outcomes, outputs, relevance, template metadata remain absent, not default empty', () => {
    const raw = {
      contractVersion: '1.2'
    };
    const adapted = adaptProvisionalResponse(raw);
    expect(adapted.outcomeFamilies).toBeUndefined();
    expect(adapted.outputFamilies).toBeUndefined();
    expect(adapted.crossCuttingRelevance).toBeUndefined();
    expect(adapted.explanationTemplateMetadata).toBeUndefined();
  });
});
