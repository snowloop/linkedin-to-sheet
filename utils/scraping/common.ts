/** Reads the first non-empty `<meta>` tag content among the given names. */
export function getMetaContent(doc: Document, names: string[]): string {
  for (const name of names) {
    const el = doc.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`,
    );
    const content = el?.getAttribute('content')?.trim();
    if (content) return content;
  }
  return '';
}

/** Collapses whitespace and trims; safe for `null`/`undefined` input. */
export function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Returns the first link on the page whose href matches the given pattern. */
export function findLinkHref(doc: Document, pattern: RegExp): string {
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const href = (anchor as HTMLAnchorElement).href;
    if (pattern.test(href)) return href;
  }
  return '';
}
