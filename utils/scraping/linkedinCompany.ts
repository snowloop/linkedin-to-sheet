import { cleanText } from './common';
import type { ScrapedCompanyData } from '../types';

/**
 * Extraction of company info from a LinkedIn company page
 * (`linkedin.com/company/...`).
 *
 * The "À propos" / "About" page lists its fields as label/value rows. Two
 * markups are supported:
 *   - legacy: <dl><dt><h3>Site web</h3></dt><dd>...</dd>...</dl>
 *   - current (SDUI, obfuscated class names, no semantic tags):
 *     <div><div><p>Site web</p></div><div><a href="...">...</a></div></div>
 * so fields are found by their (FR/EN) label text, never by CSS classes,
 * which LinkedIn changes often. The header info line (industry, location,
 * followers, size) is used as a fallback on other company tabs, where the
 * rows are not rendered. Every field stays editable in the popup.
 */

type Field = 'website' | 'industry' | 'companySize' | 'location';

const LABELS: Record<Field, RegExp> = {
  website: /^(site web|website|web site)$/,
  industry: /^(secteur|secteur d'activite|industry)$/,
  companySize: /^(taille de l'entreprise|company size)$/,
  location: /^(siege social|siege|headquarters)$/,
};

const SIZE_PATTERN = /employ|employee/i;
const FOLLOWERS_PATTERN = /abonn|follower/i;

/** Lowercases, strips accents and unifies apostrophes: "Siège social" -> "siege social". */
function normalizeLabel(text: string | null): string {
  return cleanText(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

/** The element holding the value of a label: the next `<dd>` (legacy) or the sibling of the label's wrapper. */
function findValueElement(label: Element): Element | null {
  if (label.localName === 'dt') {
    // The value is the first <dd> before the next <dt> (size has several <dd>).
    let sibling = label.nextElementSibling;
    while (sibling && sibling.localName !== 'dd' && sibling.localName !== 'dt') {
      sibling = sibling.nextElementSibling;
    }
    return sibling?.localName === 'dd' ? sibling : null;
  }
  return label.parentElement?.nextElementSibling ?? null;
}

function readDefinitionList(doc: Document): Partial<Record<Field, Element>> {
  const values: Partial<Record<Field, Element>> = {};

  for (const label of Array.from(doc.querySelectorAll('dt, p'))) {
    const text = normalizeLabel(label.textContent);
    const field = (Object.keys(LABELS) as Field[]).find((key) => LABELS[key].test(text));
    if (!field || values[field]) continue;

    const value = findValueElement(label);
    if (value) values[field] = value;
  }

  return values;
}

const SEPARATOR = '·';

/** Header info line: e.g. ["Services et conseil", "Neuilly-sur-Seine", "3 K abonnés", "11-50 employés"]. */
function readTopCardItems(doc: Document): string[] {
  const legacy = Array.from(
    doc.querySelectorAll('.org-top-card-summary-info-list__info-item'),
  )
    .map((el) => cleanText(el.textContent))
    .filter(Boolean);
  if (legacy.length) return legacy;

  // Current markup: items are siblings separated by "·" elements.
  for (const separator of Array.from(doc.querySelectorAll('p'))) {
    if (cleanText(separator.textContent) !== SEPARATOR || !separator.parentElement) continue;
    return Array.from(separator.parentElement.children)
      .map((el) => cleanText(el.textContent))
      .filter((text) => text && text !== SEPARATOR);
  }
  return [];
}

function readTopCard(doc: Document): Partial<Record<Field, string>> {
  const items = readTopCardItems(doc);

  const size = items.find((item) => SIZE_PATTERN.test(item));
  const rest = items.filter((item) => !SIZE_PATTERN.test(item) && !FOLLOWERS_PATTERN.test(item));

  return { companySize: size, industry: rest[0], location: rest[1] };
}

/** LinkedIn wraps external links in /redir/redirect?url=... or /safety/go/?url=...; return the real target. */
function unwrapRedirect(href: string): string {
  if (!/linkedin\.com\/(redir\/redirect|safety\/go)/i.test(href)) return href;
  try {
    return new URL(href).searchParams.get('url') ?? href;
  } catch {
    return href;
  }
}

function extractWebsite(doc: Document, definitionValue: Element | undefined): string {
  const anchor = definitionValue?.querySelector('a[href]');
  if (anchor) return unwrapRedirect((anchor as HTMLAnchorElement).href);
  if (definitionValue) return cleanText(definitionValue.textContent);

  // Company home tab: the "Visit website" button. Leave empty rather than
  // guess an arbitrary external link.
  for (const link of Array.from(doc.querySelectorAll('a[href]'))) {
    if (/site web|website/i.test(cleanText(link.textContent))) {
      return unwrapRedirect((link as HTMLAnchorElement).href);
    }
  }
  return '';
}

function extractName(doc: Document): string {
  const h1 = doc.querySelector('h1');
  const fromHeading = cleanText(h1?.getAttribute('title') || h1?.textContent);
  if (fromHeading) return fromHeading;

  // Titles look like "(2) EVERSA : À propos | LinkedIn".
  return cleanText(doc.title)
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*\|\s*LinkedIn$/i, '')
    .replace(/\s*:\s*(à propos|about|accueil|home|posts|publications|emplois|jobs|personnes|people).*$/i, '');
}

/** https://www.linkedin.com/company/eversa/about/?x=1 -> https://www.linkedin.com/company/eversa/ */
function canonicalCompanyUrl(pageUrl: string): string {
  const match = /^(https?:\/\/[^/]*linkedin\.com\/company\/[^/?#]+)/i.exec(pageUrl);
  return match ? `${match[1]}/` : (pageUrl.split(/[?#]/)[0] ?? pageUrl);
}

export function extractLinkedInCompanyInfo(
  doc: Document,
  pageUrl: string,
): ScrapedCompanyData {
  const definitions = readDefinitionList(doc);
  const topCard = readTopCard(doc);

  const definitionText = (field: Field): string =>
    cleanText(definitions[field]?.textContent);

  return {
    name: extractName(doc),
    websiteUrl: extractWebsite(doc, definitions.website),
    linkedinUrl: canonicalCompanyUrl(pageUrl),
    industry: definitionText('industry') || topCard.industry || '',
    companySize: definitionText('companySize') || topCard.companySize || '',
    location: definitionText('location') || topCard.location || '',
  };
}
