import { googleSettingsItem, googleTokensItem } from '../../utils/google/auth';
import { sendMessage } from '../../utils/messaging';

const form = document.querySelector<HTMLFormElement>('#settings-form')!;
const connectBtn = document.querySelector<HTMLButtonElement>('#connect-btn')!;
const disconnectBtn = document.querySelector<HTMLButtonElement>('#disconnect-btn')!;
const connectionStatusEl = document.querySelector<HTMLParagraphElement>('#connection-status')!;
const spreadsheetStatusEl = document.querySelector<HTMLParagraphElement>('#spreadsheet-status')!;
const saveBtn = document.querySelector<HTMLButtonElement>('#save-settings-btn')!;
const saveFeedbackEl = document.querySelector<HTMLParagraphElement>('#save-feedback')!;
const spreadsheetInput = form.elements.namedItem('spreadsheetId') as HTMLInputElement;
const sheetSelect = form.elements.namedItem('sheetName') as HTMLSelectElement;

const VERIFY_DEBOUNCE_MS = 500;
const NOT_CONNECTED_HINT = 'Connect your Google account to set up the spreadsheet.';

let connected = false;
/** Tab names of the verified spreadsheet; empty until a verification succeeds. */
let tabs: string[] = [];
let selectedSheet = '';
/**
 * What `tabs` was fetched for: the spreadsheet ID plus the token expiry,
 * which changes on every reconnection and every token renewal. A different
 * key means the spreadsheet must be verified again.
 */
let verifiedKey: string | null = null;
let verifying = false;
/** Incremented to discard the result of any verification still in flight. */
let verifySeq = 0;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function setSpreadsheetStatus(message: string, kind: 'ok' | 'error' | '' = ''): void {
  spreadsheetStatusEl.textContent = message;
  spreadsheetStatusEl.classList.toggle('ok', kind === 'ok');
  spreadsheetStatusEl.classList.toggle('error', kind === 'error');
}

function renderConnection(): void {
  connectionStatusEl.textContent = connected ? 'Connected ✅' : 'Not connected';
  connectBtn.textContent = connected ? 'Reconnect Google account' : 'Connect Google account';
  disconnectBtn.disabled = !connected;
}

function renderSheetOptions(): void {
  sheetSelect.replaceChildren();
  const addOption = (value: string, label: string): void => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    sheetSelect.append(option);
  };

  // While nothing is verified, keep showing the saved tab (disabled) rather than an empty menu.
  const names = tabs.length > 0 ? tabs : selectedSheet ? [selectedSheet] : [];
  if (!names.includes(selectedSheet)) addOption('', names.length > 0 ? 'Select a tab…' : '—');
  
  for (const name of names) addOption(name, name);
  sheetSelect.value = names.includes(selectedSheet) ? selectedSheet : '';
}

function updateControls(): void {
  const ready = connected && !verifying && tabs.length > 0;
  spreadsheetInput.disabled = !connected;
  sheetSelect.disabled = !ready;
  saveBtn.disabled = !ready || !sheetSelect.value;
}

function resetVerification(): void {
  verifySeq++;
  verifying = false;
  verifiedKey = null;
  tabs = [];
  renderSheetOptions();
}

async function keyFor(spreadsheetId: string): Promise<string> {
  const tokens = await googleTokensItem.getValue();
  return `${spreadsheetId}|${tokens?.expiresAt ?? ''}`;
}

/** Checks the spreadsheet exists and loads its tabs into the dropdown. */
async function verify(): Promise<void> {
  const spreadsheetId = spreadsheetInput.value.trim();
  resetVerification();

  if (!connected || !spreadsheetId) {
    setSpreadsheetStatus(connected ? '' : NOT_CONNECTED_HINT);
    updateControls();
    return;
  }

  const seq = verifySeq;
  verifying = true;
  setSpreadsheetStatus('Checking spreadsheet…');
  updateControls();

  const result = await sendMessage('verifySpreadsheet', spreadsheetId);
  const key = await keyFor(spreadsheetId);
  if (seq !== verifySeq) return; // superseded by a newer verification or a disconnection

  verifying = false;
  if (result.ok) {
    tabs = result.tabs;
    verifiedKey = key;
    setSpreadsheetStatus(`Found “${result.title}” ✅`, 'ok');
  } else {
    setSpreadsheetStatus(result.error, 'error');
  }
  renderSheetOptions();
  updateControls();
}

/** Verifies again only when the ID or the session (reconnection, token renewal) changed since the last check. */
async function verifyIfStale(): Promise<void> {
  const spreadsheetId = spreadsheetInput.value.trim();
  if (!connected || !spreadsheetId || verifying) return;
  if ((await keyFor(spreadsheetId)) === verifiedKey || verifying) return;
  await verify();
}

async function applyConnection(isConnected: boolean): Promise<void> {
  const changed = isConnected !== connected;
  connected = isConnected;
  renderConnection();

  if (!isConnected) {
    resetVerification();
    setSpreadsheetStatus(NOT_CONNECTED_HINT);
    updateControls();
    return;
  }

  if (changed) setSpreadsheetStatus('');
  updateControls();
  await verifyIfStale();
}

async function init(): Promise<void> {
  const settings = await googleSettingsItem.getValue();
  spreadsheetInput.value = settings.spreadsheetId;
  selectedSheet = settings.sheetName;
  renderSheetOptions();
  updateControls();

  // Also renews the access token, so an expired session shows up as disconnected here.
  const { connected: isConnected } = await sendMessage('getConnectionStatus', undefined);
  await applyConnection(isConnected);
}

// Fires on connection, disconnection and every token renewal, from any extension page.
googleTokensItem.watch((tokens) => void applyConnection(tokens != null));

spreadsheetInput.addEventListener('input', () => {
  // Drop the stale tab list right away so it can't be saved for the new ID.
  resetVerification();
  setSpreadsheetStatus('');
  updateControls();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void verify(), VERIFY_DEBOUNCE_MS);
});

sheetSelect.addEventListener('change', () => {
  selectedSheet = sheetSelect.value;
  updateControls();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void handleSaveSettings();
});

async function handleSaveSettings(): Promise<void> {
  if (saveBtn.disabled) return;
  await googleSettingsItem.setValue({
    spreadsheetId: spreadsheetInput.value.trim(),
    sheetName: sheetSelect.value,
  });
  saveFeedbackEl.textContent = 'Settings saved ✅';
  setTimeout(() => (saveFeedbackEl.textContent = ''), 3000);
}

connectBtn.addEventListener('click', () => void handleConnect());

async function handleConnect(): Promise<void> {
  connectBtn.disabled = true;
  connectionStatusEl.textContent = 'Connecting…';
  const result = await sendMessage('connectGoogleAccount', undefined);
  connectBtn.disabled = false;

  if (result.ok) {
    await applyConnection(true);
  } else {
    connectionStatusEl.textContent = `Connection failed: ${result.error}`;
  }
}

disconnectBtn.addEventListener('click', () => void handleDisconnect());

async function handleDisconnect(): Promise<void> {
  await sendMessage('disconnectGoogleAccount', undefined);
  await applyConnection(false);
}

void init();
