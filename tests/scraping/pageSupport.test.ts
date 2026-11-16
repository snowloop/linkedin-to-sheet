import { describe, expect, it } from 'vitest';
import { isScrapableUrl } from '../../utils/scraping/pageSupport';

describe('isScrapableUrl', () => {
  it('accepts normal http(s) pages', () => {
    expect(isScrapableUrl('https://acme.example/about')).toBe(true);
    expect(isScrapableUrl('http://acme.example/')).toBe(true);
    expect(isScrapableUrl('https://www.linkedin.com/company/eversa/about/')).toBe(true);
  });

  it('rejects blank and browser-internal tabs', () => {
    expect(isScrapableUrl(undefined)).toBe(false);
    expect(isScrapableUrl('')).toBe(false);
    expect(isScrapableUrl('about:blank')).toBe(false);
    expect(isScrapableUrl('about:newtab')).toBe(false);
    expect(isScrapableUrl('about:debugging#/runtime/this-firefox')).toBe(false);
    expect(isScrapableUrl('moz-extension://abc/popup.html')).toBe(false);
    expect(isScrapableUrl('view-source:https://acme.example/')).toBe(false);
    expect(isScrapableUrl('file:///Users/me/page.html')).toBe(false);
  });

  it('rejects sites where browsers block content scripts', () => {
    expect(isScrapableUrl('https://addons.mozilla.org/fr/firefox/')).toBe(false);
    expect(isScrapableUrl('https://chromewebstore.google.com/detail/abc')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isScrapableUrl('not a url')).toBe(false);
  });
});
