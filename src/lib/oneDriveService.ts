// src/lib/oneDriveService.ts
// Service abstraction layer for interacting with Microsoft Graph OneDrive API
//
// STRICT SERVICE RULES:
// - ALL Microsoft Graph calls must live only inside this file.
// - No Graph fetch logic or helpers in components or random files.
// - Treat system_integrations as read-only on the client.

import msalInstance, { loginRequest } from './msalConfig';
import { supabase } from '@/integrations/supabase/client';

/**
 * Normalizes MSAL / Graph API errors into user-friendly messages.
 */
function normalizeError(error: any): Error {
  if (error && error.message) {
    if (error.message.includes('AUTH_REQUIRED') || error.message.includes('interaction_required')) {
      return new Error('Microsoft authentication is required. Please sign in and try again.');
    }
    if (error.message.includes('403') || error.message.toLowerCase().includes('accessdenied')) {
      return new Error('Akses Ditolak: Pastikan akun Microsoft Anda memiliki izin menulis (Write) pada document library bersama organisasi.');
    }
    return new Error(error.message);
  }
  return new Error(String(error || 'An unknown OneDrive error occurred.'));
}

/**
 * Safely acquires a delegated Microsoft access token from the MSAL cache.
 * Throws AUTH_REQUIRED if user is not signed in or interaction is needed.
 */
async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('AUTH_REQUIRED');
  }

  // Set active account if none is explicitly set
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: msalInstance.getActiveAccount() || accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    console.warn('Silent token acquisition failed, throwing AUTH_REQUIRED', error);
    throw new Error('AUTH_REQUIRED');
  }
}

/**
 * Resolves the central Drive ID from the platform-level system_integrations table.
 * Fallback to environment variable VITE_MICROSOFT_DRIVE_ID if table lacks record.
 */
async function getCentralDriveId(): Promise<string> {
  const { data, error } = await supabase
    .from('system_integrations')
    .select('drive_id')
    .eq('provider', 'onedrive')
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Failed to query system_integrations drive_id:', error);
    throw new Error(`Failed to resolve OneDrive central drive config: ${error.message}`);
  }

  const driveId = data?.drive_id || (import.meta as any).env.VITE_MICROSOFT_DRIVE_ID;

  if (!driveId) {
    throw new Error('CONFIG_REQUIRED_DRIVE_ID_MISSING');
  }

  return driveId;
}

/**
 * Sanitizes file names to ensure compatibility with OneDrive paths.
 */
function sanitizeFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot !== -1 ? filename.substring(lastDot) : '';

  // Remove OneDrive path-unsafe characters: \ / : * ? " < > | # %
  const cleanName = name
    .replace(/[\\/:*?"<>|#%]/g, '')
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim();

  return cleanName + ext;
}

/**
 * Recursively ensures that the logical directory path exists in the target central drive.
 * Uses ignore conflict behavior so already-existing folders are preserved.
 */
export async function ensureFolderPath(organizationId: string, documentId: string): Promise<string> {
  try {
    const token = await getAccessToken();
    const driveId = await getCentralDriveId();
    const basePath = `apps/impactory/organizations/${organizationId}/library/${documentId}/original`;

    // 1. Check if the final leaf folder already exists via a quick GET
    const checkUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${basePath}`;
    const resp = await fetch(checkUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.ok) {
      return basePath;
    }

    // 2. Segment-by-segment creation to prevent path gaps
    const segments = ['apps', 'impactory', 'organizations', organizationId, 'library', documentId, 'original'];
    let currentPath = '';

    for (const segment of segments) {
      const parentPath = currentPath ? `/root:/${currentPath}:/children` : '/root/children';
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}${parentPath}`;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      const createResp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: segment,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'ignore',
        }),
      });

      if (!createResp.ok && createResp.status !== 409) {
        const errorText = await createResp.text();
        console.warn(`Folder segment creation warn [${segment}]:`, errorText);
      }
    }

    return basePath;
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * Uploads a file directly to the central OneDrive under the canonical logical path.
 */
export async function uploadFile(
  file: File,
  organizationId: string,
  documentId: string
): Promise<{
  storageItemId: string;
  driveId: string;
  webUrl: string;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
}> {
  try {
    const token = await getAccessToken();
    const driveId = await getCentralDriveId();

    const cleanFilename = sanitizeFilename(file.name);
    const storagePath = `apps/impactory/organizations/${organizationId}/library/${documentId}/original/${cleanFilename}`;

    // EXTENSION POINT FOR UPLOAD SESSIONS (Files > 4MB)
    if (file.size > 4 * 1024 * 1024) {
      console.warn('File size > 4MB. In production, consider implementing an upload session.');
    }

    // Ensure the folder path exists before writing
    await ensureFolderPath(organizationId, documentId);

    // Simple Graph PUT upload
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${storagePath}:/content`;
    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OneDrive Graph API PUT failed:', errText);
      throw new Error(`OneDrive upload failed: ${resp.statusText} (${resp.status})`);
    }

    const result = await resp.json();

    return {
      storageItemId: result.id,
      driveId: driveId,
      webUrl: result.webUrl,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      storagePath: storagePath,
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * Resolves a short-lived direct download URL for a file from Graph on demand.
 */
export async function getDownloadUrl(storageItemId: string, driveId: string): Promise<string> {
  try {
    const token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${storageItemId}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Failed to query item from OneDrive:', errText);
      throw new Error(`Failed to resolve download URL: ${resp.statusText}`);
    }

    const result = await resp.json();
    const downloadUrl = result['@microsoft.graph.downloadUrl'];

    if (!downloadUrl) {
      throw new Error('No direct download link (@microsoft.graph.downloadUrl) returned by Graph.');
    }

    return downloadUrl;
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * Deletes a file in the central OneDrive by its unique item ID.
 */
export async function deleteFile(storageItemId: string, driveId: string): Promise<void> {
  try {
    const token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${storageItemId}`;

    const resp = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok && resp.status !== 404) {
      const errText = await resp.text();
      console.error('Failed to delete item from OneDrive:', errText);
      throw new Error(`Failed to delete OneDrive file: ${resp.statusText}`);
    }
  } catch (error) {
    throw normalizeError(error);
  }
}
