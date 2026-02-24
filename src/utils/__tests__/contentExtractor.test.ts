import { describe, it, expect } from 'vitest';
import { extractTextContent, extractMainContent } from '../contentExtractor.js';

const BASE_URL = 'https://example.com/article';

describe('extractTextContent', () => {
  it('extracts text from paragraphs', () => {
    const html = `<html><body>
      <article>
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      </article>
    </body></html>`;
    const result = extractTextContent(html, BASE_URL);
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph.');
  });

  it('adds heading markers for h1-h6', () => {
    const html = `<html><body>
      <article>
        <h1>Title</h1>
        <p>Intro text.</p>
        <h2>Subtitle</h2>
        <p>More text.</p>
      </article>
    </body></html>`;
    const result = extractTextContent(html, BASE_URL);
    expect(result).toContain('# Title');
    expect(result).toContain('## Subtitle');
  });

  it('removes script and style elements', () => {
    const html = `<html><body>
      <article>
        <script>alert('xss')</script>
        <style>.hidden { display:none }</style>
        <p>Visible content.</p>
      </article>
    </body></html>`;
    const result = extractTextContent(html, BASE_URL);
    expect(result).toContain('Visible content.');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('display:none');
  });

  it('falls back to cleaned text when few structured elements', () => {
    const html = `<html><body>
      <div>Just some text without paragraphs or headings, enough content to trigger fallback mode and be meaningful.</div>
    </body></html>`;
    const result = extractTextContent(html, BASE_URL);
    expect(result).toContain('Just some text');
  });

  it('handles list items', () => {
    const html = `<html><body>
      <article>
        <p>Intro.</p>
        <ul>
          <li>Item one</li>
          <li>Item two</li>
        </ul>
      </article>
    </body></html>`;
    const result = extractTextContent(html, BASE_URL);
    expect(result).toContain('Item one');
    expect(result).toContain('Item two');
  });
});

describe('extractMainContent', () => {
  it('extracts article content via Readability', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <nav><a href="/">Home</a></nav>
      <article>
        <h1>Article Title</h1>
        <p>This is a long enough paragraph to make Readability consider it real content.
           It needs to be substantial enough to pass the minimum threshold of 100 characters.</p>
        <p>Another paragraph with more content to ensure the algorithm picks this up as the main article body.</p>
      </article>
      <footer>Footer stuff</footer>
    </body></html>`;
    const result = extractMainContent(html, BASE_URL);
    expect(result).toContain('Article Title');
    expect(result).toContain('long enough paragraph');
    // Should not include nav/footer
    expect(result).not.toContain('Footer stuff');
  });

  it('uses fallback for pages without clear article structure', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <div id="content">
        <p>Main content paragraph that is long enough to be detected by the fallback extractor and contains useful information.</p>
        <p>Another paragraph providing additional content to exceed the minimum thresholds used by the extraction algorithm.</p>
      </div>
    </body></html>`;
    const result = extractMainContent(html, BASE_URL);
    expect(result).toContain('Main content paragraph');
  });

  it('removes nav, header, footer in fallback', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <header><h1>Site Header</h1></header>
      <nav><ul><li><a href="/">Home</a></li></ul></nav>
      <main>
        <p>This is the main content of the page with enough text to be meaningful for extraction purposes.</p>
        <p>Additional content paragraph to ensure sufficient content length for reliable detection by the algorithm.</p>
      </main>
      <footer><p>Copyright 2024</p></footer>
    </body></html>`;
    const result = extractMainContent(html, BASE_URL);
    expect(result).toContain('main content');
  });

  it('returns body content as last resort', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <span>Minimal content</span>
    </body></html>`;
    const result = extractMainContent(html, BASE_URL);
    expect(result).toContain('Minimal content');
  });
});
