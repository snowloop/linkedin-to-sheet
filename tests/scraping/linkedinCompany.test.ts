import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractLinkedInCompanyInfo } from '../../utils/scraping/linkedinCompany';

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const frAboutHtml = readFileSync(
  resolve(__dirname, '../fixtures/linkedin-company-about.fr.html'),
  'utf-8',
);

describe('extractLinkedInCompanyInfo', () => {
  it('extracts all fields from a real French "À propos" page', () => {
    const result = extractLinkedInCompanyInfo(
      makeDoc(frAboutHtml),
      'https://www.linkedin.com/company/eversa/about/?viewAsMember=true',
    );

    expect(result).toEqual({
      name: 'EVERSA',
      websiteUrl: 'http://www.eversa.fr/',
      linkedinUrl: 'https://www.linkedin.com/company/eversa/',
      industry: 'Services et conseil en informatique',
      companySize: '11-50 employés',
      location: 'Neuilly-sur-Seine, Île-de-France',
      sourcePage: 'https://www.linkedin.com/company/eversa/about/?viewAsMember=true',
    });
  });

  it('extracts fields from an English about page', () => {
    const doc = makeDoc(`
      <html><body>
        <h1>Acme Inc</h1>
        <dl>
          <dt><h3>Website</h3></dt>
          <dd><a href="https://acme.example/">https://acme.example</a></dd>
          <dt><h3>Industry</h3></dt>
          <dd>Software Development</dd>
          <dt><h3>Company size</h3></dt>
          <dd>51-200 employees</dd>
          <dd>120 associated members</dd>
          <dt><h3>Headquarters</h3></dt>
          <dd>Paris, France</dd>
        </dl>
      </body></html>
    `);

    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme/');

    expect(result.name).toBe('Acme Inc');
    expect(result.websiteUrl).toBe('https://acme.example/');
    expect(result.industry).toBe('Software Development');
    expect(result.companySize).toBe('51-200 employees');
    expect(result.location).toBe('Paris, France');
  });

  it('unwraps LinkedIn redirect links for the website', () => {
    const doc = makeDoc(`
      <html><body><h1>Acme</h1><dl>
        <dt><h3>Site web</h3></dt>
        <dd><a href="https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Facme.example%2F&amp;urlhash=x">acme.example</a></dd>
      </dl></body></html>
    `);

    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme/about/');

    expect(result.websiteUrl).toBe('https://acme.example/');
  });

  it('falls back to the header info list when there is no definition list', () => {
    const doc = makeDoc(`
      <html><body>
        <h1>Acme Inc</h1>
        <div class="org-top-card-summary-info-list">
          <div class="org-top-card-summary-info-list__info-item">Software</div>
          <div class="org-top-card-summary-info-list__info-item">Lyon, France</div>
          <div class="org-top-card-summary-info-list__info-item">1&nbsp;K followers</div>
          <div class="org-top-card-summary-info-list__info-item">11-50 employees</div>
        </div>
      </body></html>
    `);

    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme/');

    expect(result.industry).toBe('Software');
    expect(result.location).toBe('Lyon, France');
    expect(result.companySize).toBe('11-50 employees');
    expect(result.websiteUrl).toBe('');
  });

  it('cleans the document title when there is no h1', () => {
    const doc = makeDoc('<html><head><title>(3) Acme Inc : À propos | LinkedIn</title></head><body></body></html>');
    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme/');
    expect(result.name).toBe('Acme Inc');
    expect(result.industry).toBe('');
  });
});
