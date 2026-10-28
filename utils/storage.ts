import { storage } from 'wxt/utils/storage';
import type { ScrapedCompanyData } from './types';

/**
 * Data captured by the in-page button, waiting for the user to open the
 * toolbar popup to add stars/status/notes/contact and save it to the sheet.
 */
export const pendingCaptureItem = storage.defineItem<ScrapedCompanyData | null>(
  'local:pendingCapture',
  { fallback: null },
);
