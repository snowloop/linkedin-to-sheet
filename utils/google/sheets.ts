import { SHEET_COLUMNS, type ProspectRow, type VerifySpreadsheetResult } from '../types';
import { getValidAccessToken, googleSettingsItem } from './auth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Human-readable header row, in the same order as `SHEET_COLUMNS`. */
export const SHEET_HEADER_LABELS = [
  'Name',
  'Website URL',
  'LinkedIn URL',
  'Date Added',
  'Industry',
  'Company Size',
  'Location',
  'Notes',
] satisfies readonly string[];

const LAST_COLUMN_LETTER = 'H'; // Must match SHEET_COLUMNS.length (13 columns -> A..M).

function rowToValues(row: ProspectRow): (string | number)[] {
  return SHEET_COLUMNS.map((column) => row[column]);
}

class SheetsApiError extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`Google Sheets API error (${status}): ${body}`);
    this.status = status;
  }
}

async function sheetsApiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const accessToken = await getValidAccessToken();
  const authHeaderValue = ['Bearer', accessToken].join(' ');
  const response = await fetch(`${SHEETS_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: authHeaderValue,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new SheetsApiError(response.status, await response.text());
  }

  return response.json();
}

function describeSpreadsheetError(error: unknown): string {
  if (error instanceof SheetsApiError) {
    if (error.status === 404) return 'Spreadsheet not found. Check the ID.';
    if (error.status === 403) return 'This Google account cannot access this spreadsheet.';
    if (error.status === 400) return "This doesn't look like a valid spreadsheet ID.";
  }
  return error instanceof Error ? error.message : String(error);
}

/** Checks that the spreadsheet exists and is readable, and returns its title and tab names. */
export async function verifySpreadsheet(spreadsheetId: string): Promise<VerifySpreadsheetResult> {
  try {
    const data = (await sheetsApiFetch(
      `/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
    )) as { properties?: { title?: string }; sheets?: { properties?: { title?: string } }[] };

    const tabs = (data.sheets ?? []).flatMap((sheet) => sheet.properties?.title ?? []);
    return { ok: true, title: data.properties?.title ?? '', tabs };
  } catch (error) {
    return { ok: false, error: describeSpreadsheetError(error) };
  }
}

/** A1 notation requires tab names with spaces/special characters to be single-quoted. */
export function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

/** Creates the header row if the target sheet/tab is empty. */
async function ensureHeaderRow(spreadsheetId: string, sheetName: string): Promise<void> {
  const range = `${sheetName}!A1:${LAST_COLUMN_LETTER}1`;
  const data = (await sheetsApiFetch(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  )) as { values?: unknown[] };

  if (data.values && data.values.length > 0) return;

  await sheetsApiFetch(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ range, values: [SHEET_HEADER_LABELS] }) },
  );
}

/**
 * Looks for an existing row matching this prospect by website or LinkedIn
 * URL (simple exact-string match; no domain normalization yet).
 * Returns the 1-indexed sheet row number, or `null` if not found.
 */
async function findExistingRowIndex(
  spreadsheetId: string,
  sheetName: string,
  row: ProspectRow,
): Promise<number | null> {
  const range = `${sheetName}!A:${LAST_COLUMN_LETTER}`;
  const data = (await sheetsApiFetch(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  )) as { values?: string[][] };

  const rows = data.values ?? [];
  const websiteColumn = SHEET_COLUMNS.indexOf('websiteUrl');
  const linkedinColumn = SHEET_COLUMNS.indexOf('linkedinUrl');

  for (let i = 1; i < rows.length; i++) {
    const existing = rows[i];
    if (!existing) continue;
    const sameWebsite = row.websiteUrl && existing[websiteColumn] === row.websiteUrl;
    const sameLinkedin = row.linkedinUrl && existing[linkedinColumn] === row.linkedinUrl;
    if (sameWebsite || sameLinkedin) return i + 1; // Sheet rows are 1-indexed.
  }

  return null;
}

/**
 * Appends `row` to the configured Google Sheet, or updates the existing row
 * in place if one already matches by website/LinkedIn URL.
 */
export async function saveProspectRow(row: ProspectRow): Promise<void> {
  const settings = await googleSettingsItem.getValue();
  if (!settings.spreadsheetId) {
    throw new Error('No spreadsheet configured. Set the Spreadsheet ID on the options page.');
  }
  const sheetName = quoteSheetName(settings.sheetName || 'Sheet1');

  await ensureHeaderRow(settings.spreadsheetId, sheetName);
  const existingRowIndex = await findExistingRowIndex(settings.spreadsheetId, sheetName, row);
  const values = [rowToValues(row)];

  if (existingRowIndex) {
    const range = `${sheetName}!A${existingRowIndex}:${LAST_COLUMN_LETTER}${existingRowIndex}`;
    await sheetsApiFetch(
      `/${settings.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ range, values }) },
    );
  } else {
    const range = `${sheetName}!A:${LAST_COLUMN_LETTER}`;
    await sheetsApiFetch(
      `/${settings.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ range, values }) },
    );
  }
}
