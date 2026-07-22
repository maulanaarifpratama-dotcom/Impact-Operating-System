import { describe, test, expect } from 'vitest';
import {
  adaptProvisionalResponse,
  PROVISIONAL_FIXTURES
} from './provisionalAdapter';

describe('Provisional Adapter Spec v1.2 Tests', () => {
  test('should parse and normalize High Confidence scenario correctly', () => {
    const adapted = adaptProvisionalResponse(PROVISIONAL_FIXTURES['FIX-DEV-HC-1']);
    
    expect(adapted.contractVersion).toBe('1.2');
    expect(adapted.contractStatus).toBe('provisional_against_v1_2');
    expect(adapted.sectors).toHaveLength(2);
    expect(adapted.sectors[0].id).toBe('SEC-ECON');
    expect(adapted.sectors[0].level).toBe('primary');
    expect(adapted.sectors[0].confidence).toBe('high');
    expect(adapted.sectors[0].evidence?.sourceField).toBe('programStory');
    
    expect(adapted.interventions).toHaveLength(2);
    expect(adapted.interventions[0].id).toBe('ARCH-TRAINING-001');
    expect(adapted.interventions[0].level).toBe('primary');
    
    expect(adapted.sdgs).toHaveLength(2);
    expect(adapted.sdgs[0].num).toBe(1);
    expect(adapted.sdgs[0].level).toBe('primary');
    
    expect(adapted.actorRoles).toHaveLength(2);
    expect(adapted.actorRoles[0].role).toBe('rights_holder');
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
});
