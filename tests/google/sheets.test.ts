import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProspectRow } from '../../utils/types';

vi.mock('../../utils/google/auth', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('fake-access-token'),
  googleSettingsItem: {
    getValue: vi.fn().mockResolvedValue({
      spreadsheetId: 'sheet-123',
      sheetName: 'Sheet1',
    }),
  },
}));

const { saveProspectRow, quoteSheetName, verifySpreadsheet } = await import('../../utils/google/sheets');

function makeRow(overrides: Partial<ProspectRow> = {}): ProspectRow {
  return {
    name: 'Acme',
    websiteUrl: 'https://acme.example/',
    linkedinUrl: 'https://www.linkedin.com/company/acme/',
    dateAdded: '01/01/2024',
    industry: 'Software',
    companySize: '51-200 employees',
    location: 'Paris',
    notes: '',
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('saveProspectRow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the header row and appends a new row when nothing matches yet', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({})) // header check: empty sheet
      .mockResolvedValueOnce(jsonResponse({})) // header creation PUT
      .mockResolvedValueOnce(jsonResponse({ values: [['Name']] })) // dedupe scan: header only
      .mockResolvedValueOnce(jsonResponse({})); // append POST

    await saveProspectRow(makeRow());

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const appendCall = fetchMock.mock.calls[3]!;
    expect(String(appendCall[0])).toContain(':append');
    expect(appendCall[1]?.method).toBe('POST');
  });

  it('updates the existing row in place when the website URL already matches', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ values: [['Name']] })) // header already present
      .mockResolvedValueOnce(
        jsonResponse({
          values: [
            ['Name'],
            ['Acme', 'https://acme.example/'], // row 2 matches on websiteUrl
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({})); // update PUT

    await saveProspectRow(makeRow());

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const updateCall = fetchMock.mock.calls[2]!;
    expect(String(updateCall[0])).toContain('A2%3AM2');
    expect(updateCall[1]?.method).toBe('PUT');
  });
});

describe('verifySpreadsheet', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the title and the tab names of an existing spreadsheet', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        properties: { title: 'Prospection' },
        sheets: [{ properties: { title: 'Sheet1' } }, { properties: { title: 'Mes prospects' } }],
      }),
    );

    await expect(verifySpreadsheet('sheet-123')).resolves.toEqual({
      ok: true,
      title: 'Prospection',
      tabs: ['Sheet1', 'Mes prospects'],
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/sheet-123?fields=');
  });

  it.each([
    [404, 'not found'],
    [403, 'cannot access'],
    [400, 'valid spreadsheet ID'],
  ])('explains a %i response', async (status, expected) => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status }));

    const result = await verifySpreadsheet('nope');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(expected);
  });
});

describe('quoteSheetName', () => {
  it('single-quotes tab names and doubles inner quotes', () => {
    expect(quoteSheetName('Mes prospects')).toBe("'Mes prospects'");
    expect(quoteSheetName("Bob's list")).toBe("'Bob''s list'");
  });
});
