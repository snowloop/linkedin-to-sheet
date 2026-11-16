/**
 * Google OAuth client shared by every user of the extension. The values are
 * injected at build time from `.env` (see `.env.example`), so they never
 * live in the repository. They end up in the shipped bundle: for an
 * installed-app ("Desktop app") client Google does not treat the secret as
 * confidential, so protection comes from the consent screen and the
 * redirect-URI rules, not from hiding it.
 */
export const GOOGLE_CLIENT_ID: string = import.meta.env.WXT_GOOGLE_CLIENT_ID ?? '';
export const GOOGLE_CLIENT_SECRET: string = import.meta.env.WXT_GOOGLE_CLIENT_SECRET ?? '';

export function assertGoogleClientConfigured(): void {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'This build has no Google OAuth client. Set WXT_GOOGLE_CLIENT_ID and WXT_GOOGLE_CLIENT_SECRET in .env and rebuild.',
    );
  }
}
