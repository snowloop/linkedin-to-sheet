import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import type { GoogleAuthTokens, GoogleSettings } from '../types';
import { generatePkcePair } from './pkce';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export const googleSettingsItem = storage.defineItem<GoogleSettings>(
  'local:googleSettings',
  {
    fallback: { clientId: '', clientSecret: '', spreadsheetId: '', sheetName: 'Sheet1' },
  },
);

export const googleTokensItem = storage.defineItem<GoogleAuthTokens | null>(
  'local:googleTokens',
  { fallback: null },
);

/**
 * Builds the redirect URI used for the OAuth flow.
 *
 * Google only accepts redirect URIs on domains it can verify, so the
 * default `https://<id>.extensions.allizom.org/` URL returned by
 * `browser.identity.getRedirectURL()` is rejected by Google's OAuth servers.
 * Starting with Firefox 86, a loopback alternative is allowed instead:
 * `http://127.0.0.1/mozoauth2/<same subdomain>`. See
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity
 * ("Getting the redirect URL").
 */
export function getGoogleRedirectUri(): string {
  const defaultRedirect = browser.identity.getRedirectURL();
  const subdomain = new URL(defaultRedirect).hostname.split('.')[0];
  return `http://127.0.0.1/mozoauth2/${subdomain}`;
}

/**
 * Runs the interactive Google OAuth consent flow (authorization code + PKCE)
 * and stores the resulting access/refresh tokens. Should only be called in
 * direct response to a user action (e.g. clicking "Connect" in the options
 * page).
 */
export async function connectGoogleAccount(): Promise<void> {
  const settings = await googleSettingsItem.getValue();
  if (!settings.clientId) {
    throw new Error(
      'Missing Google OAuth Client ID. Configure it on the extension options page first.',
    );
  }

  const { verifier, challenge } = await generatePkcePair();
  const redirectUri = getGoogleRedirectUri();

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', settings.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SHEETS_SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // `redirect_uri` is a documented but sometimes untyped option in older
  // `browser.identity` type definitions; cast narrowly for this call only.
  const resultUrl = await browser.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
    redirect_uri: redirectUri,
  } as Parameters<typeof browser.identity.launchWebAuthFlow>[0]);

  const code = new URL(resultUrl).searchParams.get('code');
  if (!code) {
    throw new Error('Google did not return an authorization code.');
  }

  await exchangeCodeForTokens(code, verifier, redirectUri, settings);
}

async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  redirectUri: string,
  settings: GoogleSettings,
): Promise<void> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${await response.text()}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await googleTokensItem.setValue({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
}

/** Returns a currently valid access token, refreshing it silently if needed. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await googleTokensItem.getValue();
  if (!tokens) {
    throw new Error(
      'Not connected to Google. Open the extension options page and connect your Google account.',
    );
  }

  const stillValid = tokens.expiresAt - 60_000 > Date.now();
  if (stillValid) return tokens.accessToken;

  if (!tokens.refreshToken) {
    throw new Error(
      'Google session expired and cannot be refreshed. Please reconnect your Google account in the options page.',
    );
  }

  const settings = await googleSettingsItem.getValue();
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: tokens.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    // Refresh token is likely revoked/expired (e.g. the 7-day limit that
    // applies to unverified Google Cloud OAuth apps in "Testing" status).
    await googleTokensItem.removeValue();
    throw new Error(
      'Failed to refresh the Google session. Please reconnect your Google account in the options page.',
    );
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const updated: GoogleAuthTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  await googleTokensItem.setValue(updated);
  return updated.accessToken;
}

export async function isGoogleConnected(): Promise<boolean> {
  return (await googleTokensItem.getValue()) != null;
}

export async function disconnectGoogleAccount(): Promise<void> {
  await googleTokensItem.removeValue();
}
