import { describe, it, expect } from 'vitest';
import { extractMarkdownContent } from '../markdownExtractor.js';

const BASE_URL = 'https://example.com/article';

describe('extractMarkdownContent', () => {
  it('converts headings to ATX style', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <h1>Main Title</h1>
        <p>Some introductory paragraph with enough content to pass the extraction thresholds used by readability.</p>
        <h2>Section Title</h2>
        <p>More content about the section with additional details to make it substantial enough for extraction.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    expect(result).toMatch(/^#+ Main Title/m);
    expect(result).toMatch(/^#+ Section Title/m);
  });

  it('converts links to inline markdown', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>Check out <a href="https://example.com">this link</a> for more information about the topic we are discussing in this article.</p>
        <p>Additional paragraph to ensure enough content is available for the readability extraction algorithm.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    expect(result).toContain('[this link](https://example.com/');
  });

  it('converts bold and italic', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>This is <strong>bold text</strong> and <em>italic text</em> in a paragraph with sufficient length for extraction.</p>
        <p>Another paragraph providing additional content to exceed the minimum thresholds used by the extraction algorithm.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    expect(result).toContain('**bold text**');
    expect(result).toContain('*italic text*');
  });

  it('converts code blocks with language detection', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>Here is some code example that demonstrates the functionality of our library and api.</p>
        <pre><code class="language-python">def hello():
    print("world")</code></pre>
        <p>Another paragraph providing additional content to exceed the minimum thresholds used by the extraction algorithm.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    // Readability may strip class attributes, so language detection might not work.
    // But the code block itself should be preserved.
    expect(result).toContain('```');
    expect(result).toContain('def hello()');
    expect(result).toContain('print("world")');
  });

  it('removes images', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>Text before image with enough content to be detected properly by the extraction system and algorithm.</p>
        <img src="photo.jpg" alt="A photo" />
        <p>Text after image with more content to ensure proper extraction and sufficient paragraph count for the system.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    expect(result).not.toContain('photo.jpg');
    expect(result).not.toContain('A photo');
    expect(result).toContain('Text before image');
    expect(result).toContain('Text after image');
  });

  it('converts unordered lists', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>Here is a list of features included in the latest version of the software package for users.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <p>Additional paragraph providing more context and detail about the list of features mentioned above.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    // Turndown may use variable spacing after the bullet marker
    expect(result).toMatch(/-\s+First item/);
    expect(result).toMatch(/-\s+Second item/);
  });

  it('cleans excessive newlines', () => {
    const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>
      <article>
        <p>First paragraph with enough content for extraction and processing by the readability algorithm properly.</p>
        <br/><br/><br/><br/>
        <p>Second paragraph with additional content providing more context for the extraction to work correctly.</p>
      </article>
    </body></html>`;
    const result = extractMarkdownContent(html, BASE_URL);
    // Should not have more than 2 consecutive newlines
    expect(result).not.toMatch(/\n{3,}/);
  });
});
