import { getGoogleRedirectUri, googleSettingsItem } from '../../utils/google/auth';
import { sendMessage } from '../../utils/messaging';

const form = document.querySelector<HTMLFormElement>('#settings-form')!;
const connectBtn = document.querySelector<HTMLButtonElement>('#connect-btn')!;
const disconnectBtn = document.querySelector<HTMLButtonElement>('#disconnect-btn')!;
const connectionStatusEl = document.querySelector<HTMLParagraphElement>('#connection-status')!;
const redirectUriInput = document.querySelector<HTMLInputElement>('#redirect-uri')!;
const saveFeedbackEl = document.querySelector<HTMLParagraphElement>('#save-feedback')!;

function field(name: string): HTMLInputElement {
  return form.elements.namedItem(name) as HTMLInputElement;
}

async function refreshConnectionStatus(): Promise<void> {
  const { connected } = await sendMessage('getConnectionStatus', undefined);
  connectionStatusEl.textContent = connected ? 'Connected ✅' : 'Not connected';
  connectBtn.textContent = connected ? 'Reconnect Google account' : 'Connect Google account';
}

async function init(): Promise<void> {
  const settings = await googleSettingsItem.getValue();
  field('clientId').value = settings.clientId;
  field('clientSecret').value = settings.clientSecret;
  field('spreadsheetId').value = settings.spreadsheetId;
  field('sheetName').value = settings.sheetName;

  // This is the actual loopback redirect URI the OAuth flow uses (see
  // `getGoogleRedirectUri` for why it differs from the raw
  // `browser.identity.getRedirectURL()` value). Google's "Desktop app"
  // client type accepts it automatically, no manual registration needed —
  // shown here mainly for debugging / in case you swap in another provider.
  redirectUriInput.value = getGoogleRedirectUri();

  await refreshConnectionStatus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void handleSaveSettings();
});

async function handleSaveSettings(): Promise<void> {
  await googleSettingsItem.setValue({
    clientId: field('clientId').value.trim(),
    clientSecret: field('clientSecret').value.trim(),
    spreadsheetId: field('spreadsheetId').value.trim(),
    sheetName: field('sheetName').value.trim() || 'Sheet1',
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
    await refreshConnectionStatus();
  } else {
    connectionStatusEl.textContent = `Connection failed: ${result.error}`;
  }
}

disconnectBtn.addEventListener('click', () => void handleDisconnect());

async function handleDisconnect(): Promise<void> {
  await sendMessage('disconnectGoogleAccount', undefined);
  await refreshConnectionStatus();
}

void init();
