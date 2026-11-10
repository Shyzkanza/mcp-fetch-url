import { describe, it, expect } from 'vitest';
import { decodeHtml, charsetFromContentType, charsetFromMeta } from '../charset.js';

// « Sortie en salle le Mercredi 4 Août 2004 » encodé en ISO-8859-1 (tretsactu.fr, pages perso free.fr)
const LATIN1 = new Uint8Array(Buffer.from('<html><head><meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"></head><body><p>Sortie le 4 Août 2004, Découvrez ici</p></body></html>', 'latin1'));
const LATIN1_SANS_DECLARATION = new Uint8Array(Buffer.from('<html><body><p>Sortie le 4 Août 2004, Découvrez ici les scènes</p></body></html>', 'latin1'));
const UTF8 = new Uint8Array(Buffer.from('<html><head><meta charset="utf-8"></head><body><p>Château de Chantilly — été</p></body></html>', 'utf8'));

describe('charset', () => {
  it('reads the charset of the Content-Type header', () => {
    expect(charsetFromContentType('text/html; charset=ISO-8859-1')).toBe('iso-8859-1');
    expect(charsetFromContentType('text/html')).toBeUndefined();
  });

  it('reads the charset of a meta tag, both forms', () => {
    expect(charsetFromMeta(LATIN1)).toBe('iso-8859-1');
    expect(charsetFromMeta(UTF8)).toBe('utf-8');
  });

  it('decodes a page declared in ISO-8859-1 by its meta tag', () => {
    expect(decodeHtml(LATIN1, 'text/html')).toContain('4 Août 2004, Découvrez');
  });

  it('the header wins over the meta tag', () => {
    expect(decodeHtml(LATIN1, 'text/html; charset=windows-1252')).toContain('Août');
  });

  it('an undeclared page that is not UTF-8 falls back to windows-1252, never « Ao�t »', () => {
    const t = decodeHtml(LATIN1_SANS_DECLARATION, 'text/html');
    expect(t).toContain('Août') ;
    expect(t).not.toContain('�');
  });

  it('a page served as UTF-8 that is really latin-1 is read as a browser would', () => {
    expect(decodeHtml(LATIN1_SANS_DECLARATION, 'text/html; charset=utf-8')).toContain('Découvrez ici les scènes');
  });

  it('UTF-8 stays UTF-8, BOM included', () => {
    expect(decodeHtml(UTF8, 'text/html; charset=utf-8')).toContain('Château de Chantilly — été');
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...UTF8]);
    expect(decodeHtml(bom, '')).toMatch(/^<html>/);
  });

  it('an unknown label falls back to UTF-8', () => {
    expect(decodeHtml(UTF8, 'text/html; charset=x-inconnu')).toContain('Château');
  });
});
