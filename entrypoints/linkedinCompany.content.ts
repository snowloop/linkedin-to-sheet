import { defineContentScript } from 'wxt/utils/define-content-script';
import { onMessage } from '../utils/messaging';
import { extractLinkedInCompanyInfo } from '../utils/scraping/linkedinCompany';
import { mountCaptureButton, unmountCaptureButton } from '../utils/ui/captureButton';

/**
 * Runs on all LinkedIn pages, because LinkedIn is a single-page app: landing
 * on the feed and clicking through to a company page never triggers a new
 * page load, so a script limited to `/company/*` would not be injected. The
 * capture button is shown only on company pages and follows URL changes.
 */
export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    const isCompanyPage = () => location.pathname.startsWith('/company/');
    const scrape = () => extractLinkedInCompanyInfo(document, location.href);

    const syncButton = () => {
      if (isCompanyPage()) mountCaptureButton(scrape);
      else unmountCaptureButton();
    };
    syncButton();
    ctx.addEventListener(window, 'wxt:locationchange', syncButton);

    onMessage('scrapeCurrentPage', () => (isCompanyPage() ? scrape() : null));
  },
});
