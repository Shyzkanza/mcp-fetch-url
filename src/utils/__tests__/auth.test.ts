import { describe, it, expect } from 'vitest';
import { isAuthorized } from '../auth.js';

const TOKEN = 'a'.repeat(64);

describe('isAuthorized', () => {
  it('accepts the bearer token', () => {
    expect(isAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it('accepts the scheme in any case and trailing spaces', () => {
    expect(isAuthorized(`bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(isAuthorized(`BEARER  ${TOKEN} `, TOKEN)).toBe(true);
  });

  it.each([
    ['no header', undefined],
    ['an empty header', ''],
    ['a wrong token', `Bearer ${'b'.repeat(64)}`],
    ['a token prefix', `Bearer ${TOKEN.slice(0, 63)}`],
    ['a longer token', `Bearer ${TOKEN}a`],
    ['the token without scheme', TOKEN],
    ['another scheme', `Basic ${TOKEN}`],
    ['two tokens', `Bearer ${TOKEN} ${TOKEN}`],
    ['an empty bearer', 'Bearer '],
  ])('refuses %s', (_label, header) => {
    expect(isAuthorized(header, TOKEN)).toBe(false);
  });
});
