/**
 * Whether the extension's content script runs on this tab. It is only
 * injected on LinkedIn, so every other page (blank tabs, browser pages,
 * other websites) can't be scanned and the popup shouldn't even try.
 */
export function isScrapableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com');
  } catch {
    return false;
  }
}
