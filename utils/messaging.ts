import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  ConnectResult,
  ProspectRow,
  SaveRowResult,
  ScrapedCompanyData,
} from './types';

/**
 * Typed message protocol shared between the popup, options page, background
 * script and content scripts. See https://webext-core.aklinker1.io/messaging
 */
export interface ProtocolMap {
  /** Content script -> background: store data scraped from the in-page button. */
  capturePending(data: ScrapedCompanyData): void;
  /** Popup -> background: read back whatever was last captured. */
  getPendingCapture(): ScrapedCompanyData | null;
  /** Popup -> background: clear the pending capture (after a successful save). */
  clearPendingCapture(): void;
  /** Popup/background -> content script: re-scrape the current page on demand. */
  scrapeCurrentPage(): ScrapedCompanyData | null;
  /** Popup -> background: append/update the row in the configured Google Sheet. */
  saveRow(data: ProspectRow): SaveRowResult;
  /** Options page -> background: run the interactive Google OAuth flow. */
  connectGoogleAccount(): ConnectResult;
  /** Options page -> background: forget stored Google tokens. */
  disconnectGoogleAccount(): void;
  /** Popup/options -> background: whether we currently hold Google tokens. */
  getConnectionStatus(): { connected: boolean };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
