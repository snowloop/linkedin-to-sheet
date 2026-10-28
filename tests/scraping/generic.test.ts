import { describe, expect, it } from 'vitest';
import { extractGenericCompanyInfo } from '../../utils/scraping/generic';

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('extractGenericCompanyInfo', () => {
  it('prefers the og:site_name meta tag for the company name', () => {
    const doc = makeDoc(`
      <html><head>
        <title>Welcome - Acme Inc</title>
        <meta property="og:site_name" content="Acme Inc" />
      </head><body><h1>Something else</h1></body></html>
    `);

    const result = extractGenericCompanyInfo(doc, 'https://acme.example/');

    expect(result.name).toBe('Acme Inc');
    expect(result.websiteUrl).toBe('https://acme.example/');
    expect(result.sourcePage).toBe('https://acme.example/');
  });

  it('falls back to <h1> then <title> when no meta tags are present', () => {
    const docWithH1 = makeDoc('<html><body><h1>  Acme   Corp  </h1></body></html>');
    expect(extractGenericCompanyInfo(docWithH1, 'https://acme.example/').name).toBe('Acme Corp');

    const docTitleOnly = makeDoc('<html><head><title>Acme Title</title></head><body></body></html>');
    expect(extractGenericCompanyInfo(docTitleOnly, 'https://acme.example/').name).toBe(
      'Acme Title',
    );
  });

  it('extracts a linkedin.com/company link when present', () => {
    const doc = makeDoc(`
      <html><body>
        <a href="https://www.linkedin.com/company/acme-inc">LinkedIn</a>
      </body></html>
    `);

    const result = extractGenericCompanyInfo(doc, 'https://acme.example/');

    expect(result.linkedinUrl).toBe('https://www.linkedin.com/company/acme-inc');
  });

  it('returns an empty linkedinUrl when no matching link exists', () => {
    const doc = makeDoc('<html><body><a href="https://twitter.com/acme">Twitter</a></body></html>');
    expect(extractGenericCompanyInfo(doc, 'https://acme.example/').linkedinUrl).toBe('');
  });
});
