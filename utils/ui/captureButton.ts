import { sendMessage } from '../messaging';
import type { ScrapedCompanyData } from '../types';

const HOST_ID = 'prospection-ext-capture-root';

/** Removes the floating button, e.g. after navigating away from a company page. */
export function unmountCaptureButton(): void {
  document.getElementById(HOST_ID)?.remove();
}

/**
 * Injects a small floating button into the page. Clicking it scrapes the
 * current page (via `scrape`) and sends the result to the background script
 * as a "pending capture", which the toolbar popup picks up so the user can
 * add stars/status/notes/contact before saving to the sheet.
 */
export function mountCaptureButton(scrape: () => ScrapedCompanyData): void {
  if (document.getElementById(HOST_ID)) return; // avoid double mount

  const host = document.createElement('div');
  host.id = HOST_ID;
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '2147483647',
  });

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-family: system-ui, sans-serif;
    }
    .btn {
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 999px;
      background: #1a73e8;
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .btn:hover { background: #1558b0; }
    .btn:disabled { opacity: 0.6; cursor: default; }
    .toast {
      margin-top: 8px;
      font-size: 12px;
      background: #202124;
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      max-width: 240px;
      text-align: right;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
    }
    .toast.visible { opacity: 1; transform: translateY(0); }
  `;

  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';

  const button = document.createElement('button');
  button.className = 'btn';
  button.type = 'button';
  button.textContent = '➕ Add to Prospection Sheet';

  const toast = document.createElement('div');
  toast.className = 'toast';

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const data = scrape();
      await sendMessage('capturePending', data);
      toast.textContent = `Captured "${data.name || 'this page'}" — open the toolbar icon to rate & save.`;
    } catch (error) {
      toast.textContent = `Could not capture this page: ${(error as Error).message}`;
    } finally {
      button.disabled = false;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 4000);
    }
  });

  wrapper.append(button, toast);
  shadow.append(style, wrapper);
  document.documentElement.append(host);
}
