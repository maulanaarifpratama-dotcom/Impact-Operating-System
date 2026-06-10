import { OrgRole } from '@/integrations/supabase/database.types';

/**
 * Utility functions for mapping database-level organization member roles
 * to application-level capabilities and permissions.
 * 
 * Follows the layout:
 * - 'owner' | 'admin' -> Admin Power (Full write, delete, invite, manage)
 * - 'member' / 'operator' -> Operator Power (Write, edit, generate AI, cannot delete org/manage members)
 * - 'viewer' / any other -> Viewer Power (Read-only, no write/AI operations)
 */

export type AppRole = OrgRole | 'operator' | 'viewer';

export interface RoleCapabilities {
  canManageMembers: boolean;
  canDeleteOrg: boolean;
  canEditSettings: boolean;
  canCreateContent: boolean; // e.g. projects, searches
  canRunAICalls: boolean;
  canViewReports: boolean;
}

/**
 * Checks if a role has Admin-level permissions (owner or admin).
 */
export function hasAdminPower(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === 'owner' || normalized === 'admin';
}

/**
 * Checks if a role has Operator-level permissions (owner, admin, member, or operator).
 * Operator role can create content and run AI, but cannot manage members or delete org.
 */
export function hasOperatorPower(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  // Any legitimate member/operator or higher has operator power
  return normalized === 'owner' || normalized === 'admin' || normalized === 'member' || normalized === 'operator';
}

/**
 * Returns a friendly, localized display name for a database role.
 */
export function getRoleDisplayName(role: string | null | undefined): string {
  if (!role) return 'Tamu';
  const normalized = role.toLowerCase().trim();
  switch (normalized) {
    case 'owner':
      return 'Pemilik (Owner)';
    case 'admin':
      return 'Administrator';
    case 'member':
    case 'operator':
      return 'Operator / Anggota';
    case 'viewer':
      return 'Pengamat (Viewer)';
    default:
      return 'Anggota';
  }
}

/**
 * Get detailed capabilities/permissions mapped to a specific role.
 */
export function getRoleCapabilities(role: string | null | undefined): RoleCapabilities {
  const isSetupAdmin = hasAdminPower(role);
  const isSetupOperator = hasOperatorPower(role);

  return {
    canManageMembers: isSetupAdmin,
    canDeleteOrg: role?.toLowerCase().trim() === 'owner', // Only owner can delete the organization
    canEditSettings: isSetupAdmin,
    canCreateContent: isSetupOperator,
    canRunAICalls: isSetupOperator,
    canViewReports: true, // Everyone in the org can view reports
  };
}
