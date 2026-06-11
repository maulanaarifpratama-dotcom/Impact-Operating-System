// src/lib/msalConfig.ts
// Configuration for Microsoft Authentication Library (MSAL) Browser

import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const clientId = (import.meta as any).env.VITE_MICROSOFT_CLIENT_ID || '';
const tenantId = (import.meta as any).env.VITE_MICROSOFT_TENANT_ID || 'common';

// Construct the authority URL
const authority = `https://login.microsoftonline.com/${tenantId}`;

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: authority,
    // Dynamically fallback to window.location.origin in dev mode, or use explicit redirect URI
    redirectUri: (import.meta as any).env.VITE_MICROSOFT_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'https://impactory.id'),
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'https://impactory.id',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage', // Store login state to survive tab refreshes
    storeAuthStateInCookie: false, // Set to true if having issues on IE11 or Safari
  },
};

// Request scopes required for OneDrive integration
export const loginRequest = {
  scopes: [
    'openid',
    'profile',
    'offline_access',
    'User.Read',
    'Files.ReadWrite'
  ],
};

// Initialize MSAL PublicClientApplication
const msalInstance = new PublicClientApplication(msalConfig);

export default msalInstance;
