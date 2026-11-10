import { describe, it, expect, afterEach } from 'vitest';
import type { LookupOptions } from 'node:dns';
import { isBlockedAddress, assertPublicUrl, guardedLookup } from '../addressGuard.js';
import { InvalidInputError } from '../errors.js';

afterEach(() => {
  delete process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK;
});

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '127.255.255.254', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::1', '::', 'fe80::1', 'fe80::1%eth0', 'fd00::1', 'fc00::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', '[::1]',
  ])('refuses %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8',
    '64:ff9b::808:808'])('accepts %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it('refuses what is not an IP address', () => {
    expect(isBlockedAddress('localhost')).toBe(true);
  });
});

describe('assertPublicUrl', () => {
  it.each([
    'http://127.0.0.1:3000/health',
    'http://2130706433/', // 127.0.0.1 en décimal, normalisé par le parseur d'URL
    'http://0x7f.1/',
    'http://127.1/',
    'http://[::1]:8080/',
    'http://[::ffff:127.0.0.1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://10.0.1.12/',
  ])('refuses %s', (url) => {
    expect(() => assertPublicUrl(new URL(url))).toThrow(/Blocked URL/);
  });

  it('accepts a public address or a name (the name is checked at connection time)', () => {
    expect(() => assertPublicUrl(new URL('https://93.184.215.14/'))).not.toThrow();
    expect(() => assertPublicUrl(new URL('http://localhost:3000/'))).not.toThrow();
  });

  it('refuses another protocol', () => {
    expect(() => assertPublicUrl(new URL('file:///etc/passwd'))).toThrow(/Invalid URL protocol/);
    expect(() => assertPublicUrl(new URL('data:text/html,hi'))).toThrow(/Invalid URL protocol/);
  });

  it('lets private addresses through when SCRAPIDOU_ALLOW_PRIVATE_NETWORK=true', () => {
    process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK = 'true';
    expect(() => assertPublicUrl(new URL('http://127.0.0.1:3000/'))).not.toThrow();
    expect(() => assertPublicUrl(new URL('file:///etc/passwd'))).toThrow(/Invalid URL protocol/);
  });
});

function lookup(host: string, options: LookupOptions): Promise<{ err: unknown; address: unknown }> {
  return new Promise((resolve) => {
    guardedLookup(host, options, (err, address) => resolve({ err, address }));
  });
}

describe('guardedLookup', () => {
  it('refuses a name that resolves to a private address', async () => {
    for (const options of [{}, { all: true }]) {
      const { err } = await lookup('localhost', options);
      expect(err).toBeInstanceOf(InvalidInputError);
      expect(String((err as Error).message)).toMatch(/Blocked URL: localhost \(/);
    }
  });

  it('answers in the shape asked when allowed', async () => {
    process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK = 'true';
    const one = await lookup('localhost', { family: 4 });
    expect(one.err).toBeNull();
    expect(one.address).toBe('127.0.0.1');
    const all = await lookup('localhost', { all: true, family: 4 });
    expect(all.err).toBeNull();
    // une ou plusieurs adresses selon /etc/hosts de la machine (deux sur les runners Ubuntu)
    const list = all.address as { address: string; family: number }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list).toContainEqual({ address: '127.0.0.1', family: 4 });
    expect(list.every((a) => a.family === 4 && a.address.startsWith('127.'))).toBe(true);
  });
});
