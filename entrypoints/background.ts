import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  connectGoogleAccount,
  disconnectGoogleAccount,
  isGoogleConnected,
} from '../utils/google/auth';
import { saveProspectRow } from '../utils/google/sheets';
import { onMessage } from '../utils/messaging';
import { pendingCaptureItem } from '../utils/storage';
import type { ProspectRow } from '../utils/types';

export default defineBackground(() => {
  onMessage('capturePending', async (message) => {
    await pendingCaptureItem.setValue(message.data);
    await updateBadge();
  });

  onMessage('getPendingCapture', async () => {
    return await pendingCaptureItem.getValue();
  });

  onMessage('clearPendingCapture', async () => {
    await pendingCaptureItem.removeValue();
    await updateBadge();
  });

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
      await saveProspectRow(message.data as ProspectRow);
      await pendingCaptureItem.removeValue();
      await updateBadge();
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, error: (error as Error).message } as const;
    }
  });

  void updateBadge();
});

/**
 * Shows a small "1" badge on the toolbar icon while a capture is pending.
 * The badge API is `browser.action` under MV3 and `browser.browserAction`
 * under MV2 (the default when targeting Firefox); support both.
 */
async function updateBadge(): Promise<void> {
  const pending = await pendingCaptureItem.getValue();
  const actionApi =
    (browser as unknown as { action?: typeof browser.browserAction }).action ??
    browser.browserAction;
  await actionApi.setBadgeText({ text: pending ? '1' : '' });
  await actionApi.setBadgeBackgroundColor?.({ color: '#1a73e8' });
}
