import { describe, it, expect } from 'vitest';
import { extractRelatedLinks } from '../linkExtractor.js';

const BASE_URL = 'https://example.com/article/my-post';

describe('extractRelatedLinks', () => {
  it('returns empty array for page without links', () => {
    const html = '<html><body><p>Just text, no links.</p></body></html>';
    expect(extractRelatedLinks(html, BASE_URL)).toEqual([]);
  });

  it('extracts links from "related" section by class', () => {
    const html = `<html><body>
      <article><p>Main content here.</p></article>
      <div class="related-articles">
        <a href="/article/other-post">Other Post</a>
        <a href="/article/third-post">Third Post</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Other Post')).toBe(true);
    expect(links.some(l => l.text === 'Third Post')).toBe(true);
  });

  it('extracts links from "See also" section by heading', () => {
    const html = `<html><body>
      <article>
        <p>Article content paragraph.</p>
        <h2>See also</h2>
        <ul>
          <li><a href="/article/related1">Related Article One</a></li>
          <li><a href="/article/related2">Related Article Two</a></li>
        </ul>
      </article>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Related Article One')).toBe(true);
  });

  it('extracts links from "Voir aussi" section (French)', () => {
    const html = `<html><body>
      <article>
        <p>Contenu de l'article.</p>
        <h2>Voir aussi</h2>
        <ul>
          <li><a href="/article/lien1">Article Lié Un</a></li>
        </ul>
      </article>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Article Lié Un')).toBe(true);
  });

  it('extracts links from aside with aria-label "related"', () => {
    const html = `<html><body>
      <aside aria-label="related articles">
        <a href="/article/aside-link">Aside Related Link</a>
      </aside>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Aside Related Link')).toBe(true);
  });

  it('filters out external links (different domain)', () => {
    const html = `<html><body>
      <main>
        <p>Content with links.</p>
        <a href="/article/internal">Internal Link</a>
        <a href="https://other-site.com/page">External Link</a>
      </main>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.url.includes('other-site.com'))).toBe(false);
  });

  it('filters out social media links', () => {
    const html = `<html><body>
      <div class="related">
        <a href="https://twitter.com/user">Twitter Link</a>
        <a href="https://facebook.com/page">Facebook Link</a>
        <a href="/article/real">Real Article</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.url.includes('twitter.com'))).toBe(false);
    expect(links.some(l => l.url.includes('facebook.com'))).toBe(false);
    expect(links.some(l => l.text === 'Real Article')).toBe(true);
  });

  it('filters out navigation links (class-based)', () => {
    const html = `<html><body>
      <div class="related">
        <a href="/page" class="nav-link">Nav Link</a>
        <a href="/article/good">Good Article</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Nav Link')).toBe(false);
    expect(links.some(l => l.text === 'Good Article')).toBe(true);
  });

  it('deduplicates links by URL', () => {
    const html = `<html><body>
      <div class="related">
        <a href="/article/dupe">Duplicate Link</a>
      </div>
      <div class="see-also">
        <a href="/article/dupe">Duplicate Link</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    const dupeLinks = links.filter(l => l.url.includes('/article/dupe'));
    expect(dupeLinks.length).toBe(1);
  });

  it('ignores links pointing to the same page', () => {
    const html = `<html><body>
      <div class="related">
        <a href="/article/my-post">Same Page</a>
        <a href="/article/other">Other Page</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Same Page')).toBe(false);
    expect(links.some(l => l.text === 'Other Page')).toBe(true);
  });

  it('ignores links with very short text', () => {
    const html = `<html><body>
      <div class="related">
        <a href="/article/short">Hi</a>
        <a href="/article/valid">Valid Link Text</a>
      </div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.some(l => l.text === 'Hi')).toBe(false);
    expect(links.some(l => l.text === 'Valid Link Text')).toBe(true);
  });

  it('limits results to 50 links max', () => {
    const relatedLinks = Array.from({ length: 60 }, (_, i) =>
      `<a href="/article/link-${i}">Article Number ${i}</a>`
    ).join('');
    const html = `<html><body>
      <div class="related-articles">${relatedLinks}</div>
    </body></html>`;
    const links = extractRelatedLinks(html, BASE_URL);
    expect(links.length).toBeLessThanOrEqual(50);
  });

  it('filters Wikipedia special pages', () => {
    const html = `<html><body>
      <main>
        <article>
          <p>Wikipedia article content with lots of text for proper extraction and detection.</p>
          <a href="/wiki/Normal_Page">Normal Page</a>
          <a href="/wiki/Spécial:Contributions">Special Page</a>
          <a href="/w/index.php?title=Page&action=edit">Edit Link</a>
          <a href="/wiki/Catégorie:Test">Category Link</a>
        </article>
      </main>
    </body></html>`;
    const links = extractRelatedLinks(html, 'https://fr.wikipedia.org/wiki/Test');
    expect(links.some(l => l.url.includes('Spécial:'))).toBe(false);
    expect(links.some(l => l.url.includes('w/index.php'))).toBe(false);
    expect(links.some(l => l.url.includes('Catégorie:'))).toBe(false);
  });
});
