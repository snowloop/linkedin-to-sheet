/// <reference types="@wxt-dev/auto-icons" />
import { defineConfig } from 'wxt';

// See https://wxt.dev/guide/essentials/config/manifest.html
export default defineConfig({
  // Generates PNG icons (Chrome rejects SVG) from the SVG source.
  modules: ['@wxt-dev/auto-icons'],
  autoIcons: { baseIconPath: 'public/icon.svg' },
  manifest: ({ browser }) => ({
    name: 'Linkedin to Sheet',
    description: 'Send company info from LinkedIn company pages and websites to a Google Sheet.',
    permissions: ['storage', 'identity', 'tabs'],
    host_permissions: [
      // Token exchange / refresh endpoint.
      'https://oauth2.googleapis.com/*',
      // Google Sheets API v4.
      'https://sheets.googleapis.com/*',
    ],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Fixed ID so browser.identity.getRedirectURL() stays stable across
          // `npm run dev` reloads (temporary installs otherwise get a new
          // random ID, and therefore a new redirect URL, every time).
          // Feel free to change this to your own identifier.
          id: 'linkedin-to-sheet@snowloop.com',
          strict_min_version: '159.0',
          data_collection_permissions: {
            required: ['none'],
            optional: [],
          },
        },
      },
    }),
  }),
});
