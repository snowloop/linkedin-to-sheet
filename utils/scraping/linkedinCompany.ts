import { cleanText, getMetaContent } from './common';
import type { ScrapedCompanyData } from '../types';

/**
 * Best-effort extraction of company info from a LinkedIn company page
 * (`linkedin.com/company/...`).
 *
 * IMPORTANT: LinkedIn frequently changes its markup and class names, and
 * most of the page is only rendered for logged-in users. The selectors
 * below are a defensive, multi-fallback best effort, not a guarantee. Every
 * field is editable in the popup before saving, so wrong/empty guesses are
 * just a minor inconvenience. If LinkedIn changes its DOM, open the page's
 * devtools, inspect the relevant element, and update the selectors here.
 */
export function extractLinkedInCompanyInfo(
  doc: Document,
  pageUrl: string,
): ScrapedCompanyData {
  const name = cleanText(
    doc.querySelector('h1')?.textContent ||
      getMetaContent(doc, ['og:title']).replace(/\s*\|\s*LinkedIn$/i, '') ||
      doc.title.replace(/\s*\|\s*LinkedIn$/i, ''),
  );

  const websiteUrl = cleanText(
    findExternalWebsiteLink(doc) || getMetaContent(doc, ['og:url']),
  );

  const aboutText = cleanText(
    doc.querySelector(
      '.org-top-card-summary-info-list, .org-page-details, [data-test-id="about-us"]',
    )?.textContent,
  );

  return {
    name,
    websiteUrl,
    // Canonical company URL without query string/tracking params.
    linkedinUrl: pageUrl.split('?')[0] ?? pageUrl,
    industry: extractAfterLabel(aboutText, /industry\s*:?/i),
    companySize: extractCompanySize(aboutText),
    location: extractAfterLabel(aboutText, /headquarters\s*:?|location\s*:?/i),
    sourcePage: pageUrl,
  };
}

/** Looks for the first link that points off LinkedIn, likely the "Website" field. */
function findExternalWebsiteLink(doc: Document): string {
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const href = (anchor as HTMLAnchorElement).href;
    if (href && !/linkedin\.com/i.test(href) && /^https?:\/\//i.test(href)) {
      return href;
    }
  }
  return '';
}

/**
 * Naive "label: value"-style extraction from a blob of concatenated text
 * (LinkedIn's "about" section renders as a flat list of short strings, e.g.
 * "Industry: Software Development • 51-200 employees • Headquarters: Paris").
 * Returns the short snippet of text right after the matched label, if any.
 */
function extractAfterLabel(text: string, labelPattern: RegExp): string {
  const match = labelPattern.exec(text);
  if (!match) return '';
  let start = match.index + match[0].length;
  // Skip any separating colon/dash/whitespace left right after the label.
  while (start < text.length && /[\s:–-]/.test(text[start] ?? '')) start++;
  const snippet = text.slice(start, start + 60);
  return cleanText(snippet.split(/[•|]/)[0]);
}

/**
 * Company size is rendered as "<number>(-<number>)? employees" (the number
 * comes *before* the "employees" label), so it needs its own pattern rather
 * than `extractAfterLabel`.
 */
function extractCompanySize(text: string): string {
  const match = /[\d,]+\s*-\s*[\d,]+\+?\s*employees?|[\d,]+\+?\s*employees?/i.exec(text);
  return match ? cleanText(match[0]) : '';
}
