import { defineContentScript } from 'wxt/utils/define-content-script';
import { onMessage } from '../utils/messaging';
import { extractLinkedInCompanyInfo } from '../utils/scraping/linkedinCompany';

/**
 * Answers the popup's "scrape this page" request on LinkedIn company pages.
 *
 * LinkedIn is a single-page app, so the script is injected on every LinkedIn
 * page (navigating from the feed to a company never triggers a new page
 * load) and the URL is checked at request time instead.
 */
export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    onMessage('scrapeCurrentPage', () =>
      location.pathname.startsWith('/company/')
        ? extractLinkedInCompanyInfo(document, location.href)
        : null,
    );
  },
});
