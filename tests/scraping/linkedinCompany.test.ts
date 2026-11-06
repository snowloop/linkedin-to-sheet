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

  it('extracts fields from the current obfuscated "À propos" markup (no dl/h1)', () => {
    const doc = makeDoc(`
      <html><head><title>La Fourche : À propos | LinkedIn</title></head><body>
        <main>
          <h2>La Fourche</h2>
          <div>
            <p>Commerce de détail</p><p aria-hidden="true">·</p>
            <p>Paris, Île-de-France</p><p aria-hidden="true">·</p>
            <p>17 k<!-- --> abonnés</p><p aria-hidden="true">·</p>
            <p><a href="https://www.linkedin.com/search/">51-200 employés</a></p>
          </div>
          <div><p>Une longue description.</p>
            <div><div><p>Site web</p></div><div><a href="https://www.linkedin.com/safety/go/?url=http%3A%2F%2Fwww%2Elafourche%2Efr&amp;urlhash=x"><p>http://www.lafourche.fr</p></a></div></div>
            <div><div><p>Téléphone</p></div><div><a href="tel:0033972274045"><p>0033972274045</p></a></div></div>
            <div><div><p>Secteur</p></div><div><p>Commerce de détail</p></div></div>
            <div><div><p>Taille de l’entreprise</p></div><div><p>51 - 200 employés</p></div><div><p><a href="#">162 membres associés</a></p></div></div>
            <div><div><p>Siège social</p></div><div><p>Paris, Île-de-France</p></div></div>
          </div>
        </main>
      </body></html>
    `);

    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/lafourche/about/');

    expect(result).toEqual({
      name: 'La Fourche',
      websiteUrl: 'http://www.lafourche.fr',
      linkedinUrl: 'https://www.linkedin.com/company/lafourche/',
      industry: 'Commerce de détail',
      companySize: '51 - 200 employés',
      location: 'Paris, Île-de-France',
    });
  });

  it('falls back to the "·"-separated header line with the current markup', () => {
    const doc = makeDoc(`
      <html><head><title>La Fourche | LinkedIn</title></head><body>
        <div>
          <p>Commerce de détail</p><p>·</p><p>Paris, Île-de-France</p><p>·</p>
          <p>17 k abonnés</p><p>·</p><p><a href="#">51-200 employés</a></p>
        </div>
      </body></html>
    `);

    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/lafourche/');

    expect(result.industry).toBe('Commerce de détail');
    expect(result.location).toBe('Paris, Île-de-France');
    expect(result.companySize).toBe('51-200 employés');
  });

  it('cleans the document title when there is no h1', () => {
    const doc = makeDoc('<html><head><title>(3) Acme Inc : À propos | LinkedIn</title></head><body></body></html>');
    const result = extractLinkedInCompanyInfo(doc, 'https://www.linkedin.com/company/acme/');
    expect(result.name).toBe('Acme Inc');
    expect(result.industry).toBe('');
  });
});
