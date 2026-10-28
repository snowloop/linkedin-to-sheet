import { defineContentScript } from 'wxt/utils/define-content-script';
import { onMessage } from '../utils/messaging';
import { extractGenericCompanyInfo } from '../utils/scraping/generic';
import { mountCaptureButton } from '../utils/ui/captureButton';

/**
 * Runs on every page except LinkedIn (which has its own, more specific
 * content script). Injects the floating "Add to Prospection Sheet" button
 * and responds to on-demand re-scrape requests from the popup.
 */
export default defineContentScript({
  matches: ['*://*/*'],
  excludeMatches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    mountCaptureButton(() => extractGenericCompanyInfo(document, location.href));

    onMessage('scrapeCurrentPage', () => extractGenericCompanyInfo(document, location.href));
  },
});
