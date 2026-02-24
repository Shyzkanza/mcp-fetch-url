import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { normalizeUrl, extractLinkText } from '../urlUtils.js';

describe('normalizeUrl', () => {
  it('removes fragment from URL', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('removes trailing slash (non-root)', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
  });

  it('keeps trailing slash for root path', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('lowercases the URL', () => {
    expect(normalizeUrl('https://Example.COM/Page')).toBe('https://example.com/Page'.toLowerCase());
  });

  it('returns lowercased string for invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });

  it('removes both fragment and trailing slash', () => {
    expect(normalizeUrl('https://example.com/page/#anchor')).toBe('https://example.com/page');
  });

  it('preserves query parameters', () => {
    const result = normalizeUrl('https://example.com/page?q=test#frag');
    expect(result).toContain('q=test');
    expect(result).not.toContain('#frag');
  });
});

describe('extractLinkText', () => {
  function makeLink(html: string) {
    const $ = cheerio.load(html);
    return { $, $link: $('a').first() };
  }

  it('returns aria-label if present', () => {
    const { $link } = makeLink('<a href="/page" aria-label="My Label">Text</a>');
    expect(extractLinkText($link)).toBe('My Label');
  });

  it('returns title if no aria-label', () => {
    const { $link } = makeLink('<a href="/page" title="My Title">Text</a>');
    expect(extractLinkText($link)).toBe('My Title');
  });

  it('returns text content if no aria-label or title', () => {
    const { $link } = makeLink('<a href="/page">Click Here</a>');
    expect(extractLinkText($link)).toBe('Click Here');
  });

  it('returns img alt if text is empty', () => {
    const { $link } = makeLink('<a href="/page"><img alt="Image Alt" /></a>');
    expect(extractLinkText($link)).toBe('Image Alt');
  });

  it('returns "Link" as fallback', () => {
    const { $link } = makeLink('<a href="/page"></a>');
    expect(extractLinkText($link)).toBe('Link');
  });

  it('trims whitespace', () => {
    const { $link } = makeLink('<a href="/page">  Spaced  </a>');
    expect(extractLinkText($link)).toBe('Spaced');
  });

  it('prioritizes aria-label over title and text', () => {
    const { $link } = makeLink('<a href="/page" aria-label="Aria" title="Title">Text</a>');
    expect(extractLinkText($link)).toBe('Aria');
  });
});
