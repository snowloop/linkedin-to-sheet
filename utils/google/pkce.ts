/** Base64url-encodes raw bytes, per RFC 7636 (no padding, URL-safe alphabet). */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a PKCE (Proof Key for Code Exchange) verifier/challenge pair for
 * the Google OAuth "authorization code" flow. PKCE lets a public client
 * (like a browser extension, which cannot keep a client secret truly
 * secret) safely use the authorization code flow instead of the short-lived
 * implicit flow. See https://oauth.net/2/pkce/
 */
export async function generatePkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const verifier = base64UrlEncode(randomBytes);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge };
}
