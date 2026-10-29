import { defineBackground } from 'wxt/utils/define-background';
import {
  connectGoogleAccount,
  disconnectGoogleAccount,
  isGoogleConnected,
} from '../utils/google/auth';
import { saveProspectRow } from '../utils/google/sheets';
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
    return { connected: await isGoogleConnected() };
  });

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
