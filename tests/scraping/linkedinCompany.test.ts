import { describe, expect, it } from 'vitest';
import { extractLinkedInCompanyInfo } from '../../utils/scraping/linkedinCompany';

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('extractLinkedInCompanyInfo', () => {
  it('extracts name from h1, website from the first external link, and strips query params from the URL', () => {
    const doc = makeDoc(`
      <html><head><title>Acme Inc | LinkedIn</title></head>
      <body>
        <h1>Acme Inc</h1>
        <a href="https://acme.example/">Website</a>
        <a href="https://www.linkedin.com/company/acme-inc/people">People</a>
        <div class="org-top-card-summary-info-list">
          Industry: Software Development • 51-200 employees • Headquarters: Paris, France
        </div>
      </body></html>
    `);

    const result = extractLinkedInCompanyInfo(
      doc,
      'https://www.linkedin.com/company/acme-inc/?trk=abc',
    );

    expect(result.name).toBe('Acme Inc');
    expect(result.websiteUrl).toBe('https://acme.example/');
    expect(result.linkedinUrl).toBe('https://www.linkedin.com/company/acme-inc/');
    expect(result.industry).toBe('Software Development');
    expect(result.companySize).toBe('51-200 employees');
    expect(result.location).toBe('Paris, France');
  });

  it('falls back to the title tag (minus " | LinkedIn") when there is no h1', () => {
    const doc = makeDoc('<html><head><title>Acme Inc | LinkedIn</title></head><body></body></html>');
    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme-inc/');
    expect(result.name).toBe('Acme Inc');
  });

  it('returns empty strings for about-section fields when the markup is absent', () => {
    const doc = makeDoc('<html><body><h1>Acme Inc</h1></body></html>');
    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme-inc/');
    expect(result.industry).toBe('');
    expect(result.companySize).toBe('');
    expect(result.location).toBe('');
  });
});
