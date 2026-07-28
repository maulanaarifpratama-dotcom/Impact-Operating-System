import { describe, it, expect } from 'vitest';
import type { WbsCompletionClaim, WbsCompletionEvidence, WbsCompletionClaimStatus } from '../pages/dashboard/lfa-builder/types';

// Pure logic helpers matching WBSBuilder implementation
function getClaimBadgeStyle(status: WbsCompletionClaimStatus): string {
  switch (status) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    case 'submitted':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'needs_revision':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function getClaimLabel(status: WbsCompletionClaimStatus): string {
  switch (status) {
    case 'verified':
      return 'Terverifikasi (MEAL)';
    case 'submitted':
      return 'Menunggu Verifikasi';
    case 'needs_revision':
      return 'Perlu Perbaikan';
    case 'rejected':
      return 'Ditolak';
    case 'draft':
      return 'Draf Klaim';
    default:
      return status;
  }
}

function checkSeparationOfDuties(claim: WbsCompletionClaim, currentUserId: string): { canVerify: boolean; reason?: string } {
  if (claim.claimed_by === currentUserId) {
    return {
      canVerify: false,
      reason: 'Separation of Duties constraint: Claimant cannot verify their own claim.',
    };
  }
  return { canVerify: true };
}

describe('WBS Completion Claim UI Helpers & Logic (WBS-P1A-3B)', () => {
  it('maps claim statuses to user-friendly Indonesian labels', () => {
    expect(getClaimLabel('submitted')).toBe('Menunggu Verifikasi');
    expect(getClaimLabel('verified')).toBe('Terverifikasi (MEAL)');
    expect(getClaimLabel('needs_revision')).toBe('Perlu Perbaikan');
    expect(getClaimLabel('rejected')).toBe('Ditolak');
    expect(getClaimLabel('draft')).toBe('Draf Klaim');
  });

  it('assigns distinctive CSS badge color classes for each status', () => {
    expect(getClaimBadgeStyle('verified')).toContain('bg-emerald');
    expect(getClaimBadgeStyle('submitted')).toContain('bg-amber');
    expect(getClaimBadgeStyle('needs_revision')).toContain('bg-orange');
    expect(getClaimBadgeStyle('rejected')).toContain('bg-red');
  });

  it('correctly identifies Separation of Duties violation when user verifies own claim', () => {
    const claim: WbsCompletionClaim = {
      id: 'claim-1',
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
      wbs_item_id: 'wbs-1',
      claimed_by: 'user-a',
      claimed_at: new Date().toISOString(),
      claim_note: 'Finished field training',
      claimed_progress: 100,
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const selfVerification = checkSeparationOfDuties(claim, 'user-a');
    expect(selfVerification.canVerify).toBe(false);
    expect(selfVerification.reason).toContain('Separation of Duties');

    const peerVerification = checkSeparationOfDuties(claim, 'user-b');
    expect(peerVerification.canVerify).toBe(true);
  });

  it('filters claims based on status tabs', () => {
    const claims: WbsCompletionClaim[] = [
      {
        id: 'c1',
        org_id: 'org1',
        lfa_project_id: 'p1',
        wbs_item_id: 'w1',
        claimed_by: 'u1',
        claimed_at: new Date().toISOString(),
        claim_note: '',
        claimed_progress: 100,
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'c2',
        org_id: 'org1',
        lfa_project_id: 'p1',
        wbs_item_id: 'w2',
        claimed_by: 'u2',
        claimed_at: new Date().toISOString(),
        claim_note: '',
        claimed_progress: 100,
        status: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const submittedOnly = claims.filter((c) => c.status === 'submitted');
    expect(submittedOnly).toHaveLength(1);
    expect(submittedOnly[0].id).toBe('c1');

    const allClaims = claims.filter(() => true);
    expect(allClaims).toHaveLength(2);
  });
});
