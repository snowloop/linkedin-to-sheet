import type { GoogleSettings } from '../types';

export type SetupProblem =
  | { kind: 'missing-settings'; missing: string[]; message: string }
  | { kind: 'not-connected'; message: string };

const REQUIRED_SETTINGS: { key: keyof GoogleSettings; label: string }[] = [
  { key: 'clientId', label: 'Client ID' },
  { key: 'clientSecret', label: 'Client Secret' },
  { key: 'spreadsheetId', label: 'Spreadsheet ID' },
];

/**
 * Checks that the extension is ready to save to the sheet: every required
 * option is filled in and a Google account is connected. Returns `null` when
 * everything is ready. The sheet name is optional (it defaults to "Sheet1").
 */
export function getSetupProblem(
  settings: GoogleSettings,
  connected: boolean,
): SetupProblem | null {
  const missing = REQUIRED_SETTINGS.filter(({ key }) => !settings[key]?.trim()).map(
    ({ label }) => label,
  );

  if (missing.length > 0) {
    const everything = missing.length === REQUIRED_SETTINGS.length;
    return {
      kind: 'missing-settings',
      missing,
      message: everything
        ? 'The extension is not configured yet. Fill in the Google Client ID, Client Secret and Spreadsheet ID in the options.'
        : `The options are incomplete. Missing: ${missing.join(', ')}.`,
    };
  }

  if (!connected) {
    return {
      kind: 'not-connected',
      message: 'You are not connected to Google. Open the options and click "Connect Google account".',
    };
  }

  return null;
}
