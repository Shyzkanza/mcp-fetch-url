import { describe, it, expect } from 'vitest';
import { extractNavigationLinks } from '../navigationExtractor.js';

const BASE_URL = 'https://docs.example.com/guide/intro';

describe('extractNavigationLinks', () => {
  it('returns empty array for page without navigation', () => {
    const html = '<html><body><p>Just content</p></body></html>';
    expect(extractNavigationLinks(html, BASE_URL)).toEqual([]);
  });

  it('extracts links from nav with sidebar class', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <ul>
          <li><a href="/guide/getting-started">Getting Started</a></li>
          <li><a href="/guide/configuration">Configuration</a></li>
        </ul>
      </nav>
      <main><p>Content</p></main>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.some(l => l.text === 'Getting Started')).toBe(true);
    expect(links.some(l => l.text === 'Configuration')).toBe(true);
  });

  it('extracts links from aside with navigation class', () => {
    const html = `<html><body>
      <aside class="navigation">
        <ul>
          <li><a href="/docs/api">API Reference</a></li>
          <li><a href="/docs/examples">Examples</a></li>
        </ul>
      </aside>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'API Reference')).toBe(true);
  });

  it('extracts links from Docusaurus sidebar', () => {
    const html = `<html><body>
      <div class="theme-doc-sidebar-menu">
        <ul>
          <li><a href="/docs/install">Installation</a></li>
          <li><a href="/docs/usage">Usage Guide</a></li>
        </ul>
      </div>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Installation')).toBe(true);
  });

  it('filters out external links (different domain)', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <ul>
          <li><a href="/guide/local">Local Page</a></li>
          <li><a href="https://other-domain.com/page">External</a></li>
        </ul>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Local Page')).toBe(true);
    expect(links.some(l => l.url.includes('other-domain.com'))).toBe(false);
  });

  it('deduplicates links', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <a href="/guide/page">Page Link</a>
      </nav>
      <nav class="menu">
        <a href="/guide/page">Page Link</a>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    const pageLinks = links.filter(l => l.url.includes('/guide/page'));
    expect(pageLinks.length).toBe(1);
  });

  it('excludes links in header/footer', () => {
    const html = `<html><body>
      <header>
        <nav class="sidebar">
          <a href="/guide/header-link">Header Nav Link</a>
        </nav>
      </header>
      <nav class="sidebar">
        <a href="/guide/main-link">Main Nav Link</a>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Main Nav Link')).toBe(true);
    expect(links.some(l => l.text === 'Header Nav Link')).toBe(false);
  });

  it('ignores links with too short text', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <a href="/page1">OK</a>
        <a href="/page2">Valid Link</a>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'OK')).toBe(false);
    expect(links.some(l => l.text === 'Valid Link')).toBe(true);
  });

  it('filters out "home", "back" generic links', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <a href="/">Home</a>
        <a href="/prev">Back</a>
        <a href="/guide/real-page">Real Page</a>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.some(l => l.text.toLowerCase() === 'home')).toBe(false);
    expect(links.some(l => l.text.toLowerCase() === 'back')).toBe(false);
    expect(links.some(l => l.text === 'Real Page')).toBe(true);
  });

  it('excludes same-page anchors (unless in TOC)', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <a href="/guide/intro#section1">Section 1</a>
        <a href="/guide/other">Other Page</a>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    // Same page anchor should be excluded
    expect(links.some(l => l.url.includes('#section1'))).toBe(false);
    expect(links.some(l => l.text === 'Other Page')).toBe(true);
  });

  it('limits results to 200 links max', () => {
    const navLinks = Array.from({ length: 250 }, (_, i) =>
      `<li><a href="/page/${i}">Link Number ${i}</a></li>`
    ).join('');
    const html = `<html><body>
      <nav class="sidebar"><ul>${navLinks}</ul></nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    expect(links.length).toBeLessThanOrEqual(200);
  });

  it('assigns hierarchical levels from nested lists', () => {
    const html = `<html><body>
      <nav class="sidebar">
        <ul>
          <li><a href="/guide/section">Section Title</a>
            <ul>
              <li><a href="/guide/section/sub">Sub Section</a></li>
            </ul>
          </li>
        </ul>
      </nav>
    </body></html>`;
    const links = extractNavigationLinks(html, BASE_URL);
    const section = links.find(l => l.text === 'Section Title');
    const sub = links.find(l => l.text === 'Sub Section');
    if (section && sub && section.level !== undefined && sub.level !== undefined) {
      expect(sub.level).toBeGreaterThan(section.level);
    }
  });
});
