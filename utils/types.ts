/**
 * Data scraped from a page (company website or LinkedIn company page).
 * All fields are best-effort and always shown as editable inputs in the
 * popup, since scraping heuristics (especially on LinkedIn) are fragile.
 */
export interface ScrapedCompanyData {
  name: string;
  websiteUrl: string;
  linkedinUrl: string;
  industry: string;
  companySize: string;
  location: string;
}

export type ProspectStatus =
  | 'To contact'
  | 'Contacted'
  | 'Replied'
  | 'Meeting scheduled'
  | 'Rejected'
  | 'Not relevant';

export const PROSPECT_STATUSES: readonly ProspectStatus[] = [
  'To contact',
  'Contacted',
  'Replied',
  'Meeting scheduled',
  'Rejected',
  'Not relevant',
];

/**
 * A full row as written to the Google Sheet. `stars`, `status`, `notes`,
 * `contactUrl` and `contactName` are always filled in manually by the user
 * in the popup; everything else starts from `ScrapedCompanyData` but stays
 * editable.
 */
export interface ProspectRow extends ScrapedCompanyData {
  /** DD/MM/YYYY, set when the row is saved. */
  dateAdded: string;
  notes: string;
}

/**
 * Column order used both for the Google Sheet (A, B, C, ...) and for
 * mapping a `ProspectRow` to a flat array of values. Keep this in sync with
 * `SHEET_HEADER_LABELS` in `utils/google/sheets.ts`.
 */
export const SHEET_COLUMNS = [
  'name',
  'websiteUrl',
  'linkedinUrl',
  'dateAdded',
  'industry',
  'companySize',
  'location',
  'notes',
] as const satisfies readonly (keyof ProspectRow)[];

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export interface GoogleSettings {
  spreadsheetId: string;
  sheetName: string;
}

export type SaveRowResult = { ok: true } | { ok: false; error: string };
export type ConnectResult = { ok: true } | { ok: false; error: string };
/** Outcome of checking that a spreadsheet exists; `tabs` are its sheet (tab) names, in order. */
export type VerifySpreadsheetResult =
  | { ok: true; title: string; tabs: string[] }
  | { ok: false; error: string };
