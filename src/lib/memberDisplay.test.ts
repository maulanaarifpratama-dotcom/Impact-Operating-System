import { describe, it, expect } from 'vitest';
import {
  initials,
  formatMember,
  formatMemberCompact,
  formatMemberLabel,
  FUNCTIONAL_ROLES,
} from './memberDisplay';

describe('initials', () => {
  it('returns two-letter initials from full name', () => {
    expect(initials('John Doe')).toBe('JD');
  });

  it('returns first two characters for single name', () => {
    expect(initials('John')).toBe('JO');
  });

  it('falls back to email when name is missing', () => {
    expect(initials(null, 'alice@test.com')).toBe('AL');
  });

  it('returns "?" when both name and email are missing', () => {
    expect(initials(null, null)).toBe('?');
  });
});

describe('formatMember', () => {
  it('returns display name, initials, email, roles', () => {
    const result = formatMember(
      { full_name: 'Alice Smith', email: 'alice@test.com' },
      'MEAL Officer',
      'admin',
    );
    expect(result.displayName).toBe('Alice Smith');
    expect(result.displayInitials).toBe('AS');
    expect(result.email).toBe('alice@test.com');
    expect(result.functionalRole).toBe('MEAL Officer');
    expect(result.accessRole).toBe('admin');
  });

  it('falls back to email when full_name is missing', () => {
    const result = formatMember({ email: 'bob@test.com' }, null, 'member');
    expect(result.displayName).toBe('bob@test.com');
    expect(result.displayInitials).toBe('BO');
  });

  it('handles null job_title safely', () => {
    const result = formatMember({ full_name: 'Bob' }, null, 'member');
    expect(result.functionalRole).toBeNull();
    expect(result.accessRole).toBe('member');
  });

  it('handles missing profile gracefully', () => {
    const result = formatMember(null, null, null);
    expect(result.displayName).toBe('Pengguna');
    expect(result.email).toBeNull();
    expect(result.functionalRole).toBeNull();
  });

  it('trims whitespace from inputs', () => {
    const result = formatMember(
      { full_name: '  Eve  ' },
      '  Facilitator  ',
      '  admin  ',
    );
    expect(result.displayName).toBe('Eve');
    expect(result.functionalRole).toBe('Facilitator');
    expect(result.accessRole).toBe('admin');
  });
});

describe('formatMemberCompact', () => {
  it('shows name with functional role in parentheses', () => {
    const member = formatMember({ full_name: 'Alice' }, 'Program Officer', null);
    expect(formatMemberCompact(member)).toBe('Alice (Program Officer)');
  });

  it('shows name with access role when functional role is absent', () => {
    const member = formatMember({ full_name: 'Bob' }, null, 'admin');
    expect(formatMemberCompact(member)).toBe('Bob (admin)');
  });

  it('shows only name when no role is present', () => {
    const member = formatMember({ full_name: 'Charlie' }, null, null);
    expect(formatMemberCompact(member)).toBe('Charlie');
  });
});

describe('formatMemberLabel', () => {
  it('shows name and both roles on two conceptual lines', () => {
    const member = formatMember({ full_name: 'Alice' }, 'Finance Officer', 'member');
    const label = formatMemberLabel(member);
    expect(label).toContain('Alice');
    expect(label).toContain('Finance Officer · member');
  });

  it('shows only role line when functional role absent but access role present', () => {
    const member = formatMember({ full_name: 'Bob' }, null, 'admin');
    const label = formatMemberLabel(member);
    expect(label).toContain('Bob');
    expect(label).toContain('admin');
  });

  it('falls back to email when name is missing', () => {
    const member = formatMember({ email: 'eve@test.com' }, 'Researcher', 'member');
    const label = formatMemberLabel(member);
    expect(label).toContain('eve@test.com');
    expect(label).toContain('Researcher');
  });
});

describe('FUNCTIONAL_ROLES', () => {
  it('contains expected canonical roles', () => {
    expect(FUNCTIONAL_ROLES).toContain('Project Manager');
    expect(FUNCTIONAL_ROLES).toContain('Program Officer');
    expect(FUNCTIONAL_ROLES).toContain('MEAL Officer');
    expect(FUNCTIONAL_ROLES).toContain('Finance Officer');
    expect(FUNCTIONAL_ROLES).toContain('Field Coordinator');
    expect(FUNCTIONAL_ROLES).toContain('Researcher');
    expect(FUNCTIONAL_ROLES).toContain('Facilitator');
    expect(FUNCTIONAL_ROLES).toContain('Communications');
    expect(FUNCTIONAL_ROLES).toContain('Consultant');
    expect(FUNCTIONAL_ROLES).toContain('Volunteer');
  });

  it('has 10 entries', () => {
    expect(FUNCTIONAL_ROLES).toHaveLength(10);
  });
});
