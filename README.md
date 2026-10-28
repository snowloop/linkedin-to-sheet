# Prospection Sheet Capture

A Firefox extension that captures company info from a company website or a
LinkedIn company page, and writes it as a row to a Google Sheet — with a
manual star rating, status, notes and HR contact fields.

Built with [WXT](https://wxt.dev/) (Vite + TypeScript based web extension
framework).

## What it does

- A small floating **"➕ Add to Prospection Sheet"** button is injected on
  every page (company websites) and on LinkedIn company pages
  (`linkedin.com/company/...`).
- Clicking it scrapes best-effort info from the current page (name, website
  URL, LinkedIn URL, industry, size, location) and stores it as a "pending
  capture".
- Click the toolbar icon to open the popup, which loads that pending
  capture (or re-scans the current page if there isn't one), lets you edit
  any field, set a **star rating**, a **status**, free-text **notes**, and
  manually paste an **HR/recruiter contact** (LinkedIn URL + name/title) —
  then **Save to Sheet**.
- Saving calls the Google Sheets API directly (OAuth2, no backend script
  required). If a row already exists for the same website or LinkedIn URL,
  it's updated in place instead of duplicated.

### Columns written to the sheet

| # | Column | Filled by |
|---|---|---|
| A | Name | auto (editable) |
| B | Website URL | auto (editable) |
| C | LinkedIn URL | auto (editable) |
| D | Stars | manual |
| E | Date Added | auto (timestamp on save) |
| F | Industry | auto (editable) |
| G | Company Size | auto (editable) |
| H | Location | auto (editable) |
| I | Status | manual (dropdown) |
| J | Notes | manual |
| K | Source Page | auto |
| L | Contact (HR LinkedIn) | **manual** — paste the HR/recruiter's profile URL yourself |
| M | Contact Name / Title | **manual** |

There is intentionally **no automated HR-contact scraping**: it would mean
crawling LinkedIn's internal people-search without the user driving it,
which risks violating LinkedIn's Terms of Service. Instead, the "Contact"
columns are plain editable fields you fill in yourself after finding the
right person on LinkedIn.

## Known limitations

- **Scraping is best-effort.** Company websites vary wildly, and LinkedIn's
  markup changes often and mostly renders for logged-in users. Every
  scraped field is shown as an editable input in the popup — wrong or empty
  guesses are a minor inconvenience, not a blocker. If LinkedIn changes its
  DOM, see [`utils/scraping/linkedinCompany.ts`](utils/scraping/linkedinCompany.ts)
  and update the selectors.
- **Dedup is a simple exact-URL match** (website or LinkedIn URL), not
  domain-normalized. Minor URL variants (trailing slash, `www.`, etc.) may
  be treated as different companies.
- **Google OAuth tokens may need periodic reconnection.** While your Google
  Cloud OAuth consent screen stays in "Testing" publishing status (the
  default, and the simplest option for a personal tool), Google expires
  refresh tokens after 7 days of inactivity or when the test-user list
  changes. If saving starts failing with an auth error, just click
  "Reconnect Google account" in the options page.
- The content script runs on `<all_urls>` (all websites) so the capture
  button is available everywhere; Firefox will ask for the broad "access
  your data for all websites" permission once at install. If you'd rather
  restrict it, edit the `matches` pattern in
  [`entrypoints/generic.content.ts`](entrypoints/generic.content.ts) to a
  specific allowlist.

## One-time setup

### 1. Install dependencies

```sh
npm install
```

(This runs `wxt prepare` automatically via `postinstall`, which generates
the `.wxt/` folder with TypeScript types for `wxt.config.ts`'s
`defineConfig`, `defineBackground`, `defineContentScript`, etc.)

### 2. Create a Google Cloud OAuth client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (or reuse one).
2. **APIs & Services → Library**: enable the **Google Sheets API**.
3. **APIs & Services → OAuth consent screen**: choose **External**, fill in
   the required fields, keep the publishing status as **Testing**, and add
   your own Google account under **Test users**. You don't need to submit
   for verification for personal use.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   choose application type **Desktop app**. This matters — this extension
   uses the installed-app/PKCE flow with a loopback redirect URI
   (`http://127.0.0.1/mozoauth2/...`), which only "Desktop app" clients
   accept without manual redirect-URI registration.
5. Copy the generated **Client ID** and **Client Secret**.

### 3. Prepare your Google Sheet

1. Create a new Google Sheet (or reuse one), e.g. called "Prospection".
2. Copy its **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<spreadsheet-id>`**`/edit`
3. Note the name of the tab you want to use (default: `Sheet1`). The
   extension creates the header row automatically if the tab is empty.

### 4. Run the extension in Firefox

```sh
npm run dev
```

This opens a temporary Firefox profile with the extension installed
(via [`web-ext`](https://www.npmjs.com/package/web-ext), which WXT installs
on demand the first time — if it asks, install it as a dev dependency).

### 5. Configure the extension

1. Click the toolbar icon → **Options** (or go to `about:addons`, find the
   extension, and open its preferences).
2. Paste the **Client ID**, **Client Secret**, **Spreadsheet ID** and
   **Sheet name**, then **Save settings**.
3. Click **Connect Google account** and go through the Google consent
   screen (you'll see an "unverified app" warning — click
   **Advanced → Go to (app name)** since you're the developer/test user).

### 6. Use it

1. Browse to a company website, or a LinkedIn company page.
2. Click the floating **"➕ Add to Prospection Sheet"** button.
3. Click the toolbar icon, review/edit the fields, set stars/status/notes,
   paste the HR contact if you have one, and click **Save to Sheet**.

## Development

```sh
npm run dev          # Run in Firefox with hot reload
npm run build         # Production build (dist in .output/firefox-mv2)
npm run zip           # Build + zip for distribution
npm test              # Run unit tests (Vitest)
npm run typecheck      # Type-check without emitting
npm run lint           # ESLint
```

## Project structure

```
entrypoints/
  background.ts              # OAuth, Sheets API calls, pending-capture storage
  generic.content.ts          # Floating button on all non-LinkedIn pages
  linkedinCompany.content.ts  # Floating button on LinkedIn company pages
  popup/                      # Toolbar popup (review/edit/save form)
  options/                    # Settings page (Google OAuth + Sheet config)
utils/
  types.ts                    # Shared types (ProspectRow, ScrapedCompanyData, ...)
  messaging.ts                # Typed message protocol (@webext-core/messaging)
  storage.ts                  # Pending-capture storage item
  scraping/                   # Pure, unit-tested DOM scraping functions
  google/                     # OAuth (PKCE) + Sheets API client
  ui/captureButton.ts          # In-page floating button (shadow DOM)
tests/                        # Vitest unit tests for scraping + Sheets logic
```
