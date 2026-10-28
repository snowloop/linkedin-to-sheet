import { defineConfig } from 'wxt';

// See https://wxt.dev/guide/essentials/config/manifest.html
export default defineConfig({
  manifest: {
    name: 'Prospection Sheet Capture',
    description:
      'Capture company info from websites and LinkedIn company pages into a Google Sheet, with manual rating, status and HR contact fields.',
    permissions: ['storage', 'identity', 'tabs'],
    host_permissions: [
      // Token exchange / refresh endpoint.
      'https://oauth2.googleapis.com/*',
      // Google Sheets API v4.
      'https://sheets.googleapis.com/*',
    ],
    browser_specific_settings: {
      gecko: {
        // Fixed ID so browser.identity.getRedirectURL() stays stable across
        // `npm run dev` reloads (temporary installs otherwise get a new
        // random ID, and therefore a new redirect URL, every time).
        // Feel free to change this to your own identifier.
        id: 'prospection-sheet-capture@example.dev',
        strict_min_version: '109.0',
      },
    },
    icons: {
      16: '/icon.svg',
      32: '/icon.svg',
      48: '/icon.svg',
      128: '/icon.svg',
    },
  },
});
