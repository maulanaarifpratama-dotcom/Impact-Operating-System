/**
 * Canonical member display helpers.
 *
 * Use these instead of duplicating initials() or display formatting across
 * the codebase. The formatter applies the project's preferred layout:
 *
 *   Name
 *   Functional Role · Access Role
 *
 * Functional role (job_title) is descriptive only — it never authorises any
 * operation. Authorization remains based on access role and backend checks.
 */

export const FUNCTIONAL_ROLES = [
  'Project Manager',
  'Program Officer',
  'MEAL Officer',
  'Finance Officer',
  'Field Coordinator',
  'Researcher',
  'Facilitator',
  'Communications',
  'Consultant',
  'Volunteer',
] as const;

export type FunctionalRole = (typeof FUNCTIONAL_ROLES)[number];

export function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export interface MemberProfile {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface MemberDisplay {
  /** Preferred display name; falls back to email. */
  displayName: string;
  /** Two-character initials for avatar fallback. */
  displayInitials: string;
  /** Raw email. */
  email: string | null;
  /** Descriptive/functional role (job_title). Never authorises. */
  functionalRole: string | null;
  /** Access role — the canonical permission boundary. */
  accessRole: string | null;
  /** Member's avatar URL. */
  avatarUrl: string | null;
}

/**
 * Format a member's record into a canonical display object usable in
 * selectors, member lists, and PIC columns everywhere.
 */
export function formatMember(
  profile?: MemberProfile | null,
  jobTitle?: string | null,
  accessRole?: string | null,
  avatarUrl?: string | null,
): MemberDisplay {
  const displayName = profile?.full_name?.trim() || profile?.email?.trim() || 'Pengguna';
  const email = profile?.email?.trim() || null;
  const functionalRole = jobTitle?.trim() || null;
  const role = accessRole?.trim() || null;

  return {
    displayName,
    displayInitials: initials(profile?.full_name, email),
    email,
    functionalRole,
    accessRole: role,
    avatarUrl: avatarUrl?.trim() || profile?.avatar_url?.trim() || null,
  };
}

/**
 * One-line label for `<select>` options and compact inline display.
 *
 * Preferred format:
 *   Name
 *   Functional Role · Access Role
 *
 * Fallbacks (see spec):
 *   If job_title is null: Name \n Access Role
 *   If name is missing: Email \n Functional Role · Access Role
 */
export function formatMemberLabel(member: MemberDisplay): string {
  const roleLine =
    member.functionalRole && member.accessRole
      ? `${member.functionalRole} · ${member.accessRole}`
      : member.functionalRole || member.accessRole || '';

  if (member.displayName && roleLine) return `${member.displayName}\n${roleLine}`;
  if (member.displayName) return member.displayName;
  if (member.email && roleLine) return `${member.email}\n${roleLine}`;
  return member.email || member.displayName;
}

/**
 * Compact single-line label for tooltips or narrow displays.
 */
export function formatMemberCompact(member: MemberDisplay): string {
  const role = member.functionalRole || member.accessRole || '';
  if (member.displayName && role) return `${member.displayName} (${role})`;
  return member.displayName || member.email || 'Pengguna';
}
