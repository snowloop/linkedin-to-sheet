import { defineBackground } from 'wxt/utils/define-background';
import {
  connectGoogleAccount,
  disconnectGoogleAccount,
  getValidAccessToken,
  isGoogleConnected,
} from '../utils/google/auth';
import { saveProspectRow, verifySpreadsheet } from '../utils/google/sheets';
import { onMessage } from '../utils/messaging';

export default defineBackground(() => {
  onMessage('connectGoogleAccount', async () => {
    try {
      await connectGoogleAccount();
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, error: (error as Error).message } as const;
    }
  });

  onMessage('getConnectionStatus', async () => {
    // Renewing the token here makes a revoked/expired session drop its tokens
    // now, instead of at the next save. Failures are reflected by the status.
    await getValidAccessToken().catch(() => undefined);
    return { connected: await isGoogleConnected() };
  });

  onMessage('verifySpreadsheet', (message) => verifySpreadsheet(message.data));

  onMessage('disconnectGoogleAccount', async () => {
    await disconnectGoogleAccount();
  });

  onMessage('saveRow', async (message) => {
    try {
      await saveProspectRow(message.data);
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, error: (error as Error).message } as const;
    }
  });
});
