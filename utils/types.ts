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
  /** URL of the page the data was scraped from, for traceability. */
  sourcePage: string;
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
  /** 0 = not rated, 1-5 = star rating. */
  stars: number;
  /** DD/MM/YYYY, set when the row is saved. */
  dateAdded: string;
  status: ProspectStatus;
  notes: string;
  /** HR / recruiter LinkedIn profile URL, pasted in manually. */
  contactUrl: string;
  /** HR / recruiter name and/or title, typed in manually. */
  contactName: string;
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
  'stars',
  'dateAdded',
  'industry',
  'companySize',
  'location',
  'status',
  'notes',
  'sourcePage',
  'contactUrl',
  'contactName',
] as const satisfies readonly (keyof ProspectRow)[];

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export interface GoogleSettings {
  clientId: string;
  clientSecret: string;
  spreadsheetId: string;
  sheetName: string;
}

export type SaveRowResult = { ok: true } | { ok: false; error: string };
export type ConnectResult = { ok: true } | { ok: false; error: string };
