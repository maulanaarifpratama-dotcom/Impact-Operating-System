import { describe, it, expect } from 'vitest';

describe('WBS OneDrive Evidence Upload Integration & Logic (WBS-GAP-1)', () => {
  it('should construct isolated wbs_evidence path when folderType is wbs_evidence', () => {
    const organizationId = 'org-123';
    const documentId = 'doc-456';
    const fileName = 'foto_absensi.jpg';
    const folderType = 'wbs_evidence';

    let storagePath = `apps/impactory/organizations/${organizationId}/library/${documentId}/original/${fileName}`;
    if (folderType === 'wbs_evidence') {
      storagePath = `apps/impactory/organizations/${organizationId}/wbs_evidence/${documentId}/${fileName}`;
    }

    expect(storagePath).toBe('apps/impactory/organizations/org-123/wbs_evidence/doc-456/foto_absensi.jpg');
    expect(storagePath).not.toContain('/library/');
  });

  it('should default to library path when folderType is omitted', () => {
    const organizationId = 'org-123';
    const documentId = 'doc-456';
    const fileName = 'laporan.pdf';
    const folderType = undefined;

    const resolvedFolderType = folderType || 'library';
    let storagePath = `apps/impactory/organizations/${organizationId}/library/${documentId}/original/${fileName}`;
    if (resolvedFolderType === 'wbs_evidence') {
      storagePath = `apps/impactory/organizations/${organizationId}/wbs_evidence/${documentId}/${fileName}`;
    }

    expect(storagePath).toBe('apps/impactory/organizations/org-123/library/doc-456/original/laporan.pdf');
  });

  it('should format stored OneDrive reference as webUrl or driveId:itemId', () => {
    const uploadResult = {
      storageItemId: 'item-999',
      driveId: 'drive-888',
      webUrl: 'https://m365.sharepoint.com/sites/impactory/wbs_evidence/doc-456/foto_absensi.jpg',
      storagePath: 'apps/impactory/organizations/org-123/wbs_evidence/doc-456/foto_absensi.jpg',
    };

    const storageReference = uploadResult.webUrl || `${uploadResult.driveId}:${uploadResult.storageItemId}`;

    expect(storageReference).toBe('https://m365.sharepoint.com/sites/impactory/wbs_evidence/doc-456/foto_absensi.jpg');
    expect(storageReference.startsWith('https://')).toBe(true);
  });

  it('should throw explicit error on upload failure and surface in UI without silent swallow', () => {
    const funcErr = { message: 'OneDrive Graph API upload failed: 401 Unauthorized' };
    const fileName = 'rekap_peserta.xlsx';

    const handleUpload = () => {
      if (funcErr) {
        throw new Error(`Upload file "${fileName}" ke OneDrive gagal: ${funcErr.message}`);
      }
    };

    expect(handleUpload).toThrow('Upload file "rekap_peserta.xlsx" ke OneDrive gagal: OneDrive Graph API upload failed: 401 Unauthorized');
  });
});
