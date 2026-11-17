import { describe, expect, it } from 'vitest';
import { isScrapableUrl } from '../../utils/scraping/pageSupport';

describe('isScrapableUrl', () => {
  it('accepts LinkedIn pages', () => {
    expect(isScrapableUrl('https://www.linkedin.com/company/eversa/about/')).toBe(true);
    expect(isScrapableUrl('https://linkedin.com/company/eversa/')).toBe(true);
  });

  it('rejects other websites, where no content script runs', () => {
    expect(isScrapableUrl('https://acme.example/about')).toBe(false);
    expect(isScrapableUrl('https://notlinkedin.com/company/x')).toBe(false);
    expect(isScrapableUrl('https://linkedin.com.evil.example/')).toBe(false);
  });

  it('rejects blank and browser-internal tabs', () => {
    expect(isScrapableUrl(undefined)).toBe(false);
    expect(isScrapableUrl('')).toBe(false);
    expect(isScrapableUrl('about:blank')).toBe(false);
    expect(isScrapableUrl('moz-extension://abc/popup.html')).toBe(false);
    expect(isScrapableUrl('view-source:https://www.linkedin.com/')).toBe(false);
    expect(isScrapableUrl('file:///Users/me/page.html')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isScrapableUrl('not a url')).toBe(false);
  });
});
