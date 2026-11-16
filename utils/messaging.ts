import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  ConnectResult,
  ProspectRow,
  SaveRowResult,
  ScrapedCompanyData,
  VerifySpreadsheetResult,
} from './types';

/**
 * Typed message protocol shared between the popup, options page, background
 * script and content scripts. See https://webext-core.aklinker1.io/messaging
 */
export interface ProtocolMap {
  /** Popup -> content script: scrape the current page on demand. */
  scrapeCurrentPage(): ScrapedCompanyData | null;
  /** Popup -> background: append/update the row in the configured Google Sheet. */
  saveRow(data: ProspectRow): SaveRowResult;
  /** Options page -> background: run the interactive Google OAuth flow. */
  connectGoogleAccount(): ConnectResult;
  /** Options page -> background: forget stored Google tokens. */
  disconnectGoogleAccount(): void;
  /**
   * Popup/options -> background: whether we hold a usable Google session.
   * Renews the access token if needed, so a dead session is dropped here.
   */
  getConnectionStatus(): { connected: boolean };
  /** Options page -> background: check the spreadsheet exists and list its tabs. */
  verifySpreadsheet(spreadsheetId: string): VerifySpreadsheetResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
