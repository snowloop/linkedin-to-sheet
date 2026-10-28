import { cleanText, findLinkHref, getMetaContent } from './common';
import type { ScrapedCompanyData } from '../types';

/**
 * Best-effort extraction of company info from a generic company website.
 * Every field is shown as an editable input in the popup, so an imperfect
 * guess here is a minor inconvenience, not a correctness issue.
 */
export function extractGenericCompanyInfo(
  doc: Document,
  pageUrl: string,
): ScrapedCompanyData {
  const name = cleanText(
    getMetaContent(doc, ['og:site_name']) ||
      getMetaContent(doc, ['og:title']) ||
      doc.querySelector('h1')?.textContent ||
      doc.title,
  );

  const linkedinUrl = cleanText(
    findLinkHref(doc, /linkedin\.com\/(company|school)\//i),
  );

  return {
    name,
    websiteUrl: pageUrl,
    linkedinUrl,
    industry: '',
    companySize: '',
    location: '',
    sourcePage: pageUrl,
  };
}
