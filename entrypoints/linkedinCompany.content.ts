import { defineContentScript } from 'wxt/utils/define-content-script';
import { onMessage } from '../utils/messaging';
import { extractLinkedInCompanyInfo } from '../utils/scraping/linkedinCompany';
import { mountCaptureButton } from '../utils/ui/captureButton';

/**
 * Runs on LinkedIn company pages only. Injects the floating
 * "Add to Prospection Sheet" button and responds to on-demand re-scrape
 * requests from the popup.
 */
export default defineContentScript({
  matches: ['*://*.linkedin.com/company/*'],
  runAt: 'document_idle',
  main() {
    mountCaptureButton(() => extractLinkedInCompanyInfo(document, location.href));

    onMessage('scrapeCurrentPage', () =>
      extractLinkedInCompanyInfo(document, location.href),
    );
  },
});
