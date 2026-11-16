/** Hosts where browsers forbid content scripts, even though the URL is http(s). */
const RESTRICTED_HOSTS = ['addons.mozilla.org', 'chromewebstore.google.com', 'chrome.google.com'];

/**
 * Whether the extension's content scripts can run on this tab. Blank tabs,
 * `about:` / `moz-extension:` / `view-source:` pages, `file:` URLs and a few
 * browser-vendor sites can never be scanned, so the popup shouldn't even try.
 */
export function isScrapableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return !RESTRICTED_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
