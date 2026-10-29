import { defineContentScript } from 'wxt/utils/define-content-script';
import { onMessage } from '../utils/messaging';
import { extractGenericCompanyInfo } from '../utils/scraping/generic';

/**
 * Runs on every page except LinkedIn (which has its own content script) and
 * answers the popup's "scrape this page" request.
 */
export default defineContentScript({
  matches: ['*://*/*'],
  excludeMatches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    onMessage('scrapeCurrentPage', () => extractGenericCompanyInfo(document, location.href));
  },
});
