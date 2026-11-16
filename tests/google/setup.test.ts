import { describe, expect, it } from 'vitest';
import { getSetupProblem } from '../../utils/google/setup';
import type { GoogleSettings } from '../../utils/types';

const complete: GoogleSettings = {
  spreadsheetId: 'sheet-123',
  sheetName: 'Sheet1',
};

describe('getSetupProblem', () => {
  it('returns null when options are complete and Google is connected', () => {
    expect(getSetupProblem(complete, true)).toBeNull();
  });

  it('does not require the sheet name', () => {
    expect(getSetupProblem({ ...complete, sheetName: '' }, true)).toBeNull();
  });

  it('reports a not-configured message when every required option is empty', () => {
    const problem = getSetupProblem(
      { spreadsheetId: '', sheetName: 'Sheet1' },
      false,
    );

    expect(problem?.kind).toBe('missing-settings');
    expect(problem?.message).toContain('not configured yet');
  });

  it('treats a blank spreadsheet ID as missing', () => {
    const problem = getSetupProblem({ ...complete, spreadsheetId: '  ' }, true);

    expect(problem).toMatchObject({ kind: 'missing-settings', missing: ['Spreadsheet ID'] });
    expect(problem?.message).toContain('Spreadsheet ID');
  });

  it('reports missing options before the connection problem', () => {
    expect(getSetupProblem({ ...complete, spreadsheetId: '' }, false)?.kind).toBe('missing-settings');
  });

  it('reports not-connected when options are complete but there is no Google session', () => {
    const problem = getSetupProblem(complete, false);

    expect(problem?.kind).toBe('not-connected');
    expect(problem?.message).toContain('Connect Google account');
  });
});
