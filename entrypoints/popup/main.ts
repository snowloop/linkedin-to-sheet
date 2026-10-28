import { browser } from 'wxt/browser';
import { sendMessage } from '../../utils/messaging';
import { PROSPECT_STATUSES, type ProspectRow, type ScrapedCompanyData } from '../../utils/types';

const form = document.querySelector<HTMLFormElement>('#capture-form')!;
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!;
const statusSelect = document.querySelector<HTMLSelectElement>('#status-select')!;
const saveBtn = document.querySelector<HTMLButtonElement>('#save-btn')!;
const rescanBtn = document.querySelector<HTMLButtonElement>('#rescan-btn')!;
const openOptionsLink = document.querySelector<HTMLAnchorElement>('#open-options')!;

for (const option of PROSPECT_STATUSES) {
  const el = document.createElement('option');
  el.value = option;
  el.textContent = option;
  statusSelect.append(el);
}

function field(name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  return form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
}

function fillForm(data: Partial<ScrapedCompanyData>): void {
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const el = field(key);
    if (el) el.value = String(value);
  }
}

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function rescan(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus('No active tab found.', true);
    return;
  }
  try {
    const data = await sendMessage('scrapeCurrentPage', undefined, tab.id);
    if (data) {
      fillForm(data);
      setStatus('Scraped current page — review and save.');
    } else {
      setStatus('No prospection data detected here — fill the fields manually.');
    }
  } catch {
    setStatus('This page is not supported for automatic scraping — fill the fields manually.');
  }
}

async function init(): Promise<void> {
  const pending = await sendMessage('getPendingCapture', undefined);
  if (pending) {
    fillForm(pending);
    setStatus('Loaded captured data — review and save.');
  } else {
    await rescan();
  }
}

rescanBtn.addEventListener('click', () => void rescan());

openOptionsLink.addEventListener('click', (event) => {
  event.preventDefault();
  void browser.runtime.openOptionsPage();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void handleSave();
});

async function handleSave(): Promise<void> {
  const data = new FormData(form);
  const websiteUrl = String(data.get('websiteUrl') || '');
  const linkedinUrl = String(data.get('linkedinUrl') || '');

  const row: ProspectRow = {
    name: String(data.get('name') || ''),
    websiteUrl,
    linkedinUrl,
    stars: Number(data.get('stars') || 0),
    dateAdded: new Date().toISOString(),
    industry: String(data.get('industry') || ''),
    companySize: String(data.get('companySize') || ''),
    location: String(data.get('location') || ''),
    status: String(data.get('status') || PROSPECT_STATUSES[0]) as ProspectRow['status'],
    notes: String(data.get('notes') || ''),
    sourcePage: websiteUrl || linkedinUrl,
    contactUrl: String(data.get('contactUrl') || ''),
    contactName: String(data.get('contactName') || ''),
  };

  setStatus('Saving…');
  saveBtn.disabled = true;
  const result = await sendMessage('saveRow', row);
  saveBtn.disabled = false;

  if (result.ok) {
    setStatus('Saved to your Google Sheet ✅');
    await sendMessage('clearPendingCapture', undefined);
  } else {
    setStatus(`Error: ${result.error}`, true);
  }
}

void init();
