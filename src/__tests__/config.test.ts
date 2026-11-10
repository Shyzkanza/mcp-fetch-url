import { describe, it, expect, afterEach } from 'vitest';
import { getConfig } from '../config.js';

const ENV_KEYS = ['NODE_ENV', 'SCRAPIDOU_TOKEN', 'SCRAPIDOU_ALLOW_ANONYMOUS'] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getConfig: token', () => {
  it('refuses to start in production without a token', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SCRAPIDOU_TOKEN;
    delete process.env.SCRAPIDOU_ALLOW_ANONYMOUS;
    expect(() => getConfig()).toThrow(/SCRAPIDOU_TOKEN is required in production/);
  });

  it('serves without a token in production when SCRAPIDOU_ALLOW_ANONYMOUS=true', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SCRAPIDOU_TOKEN;
    process.env.SCRAPIDOU_ALLOW_ANONYMOUS = 'true';
    expect(getConfig().apiToken).toBeUndefined();
  });

  it('keeps the token in production, trimmed', () => {
    process.env.NODE_ENV = 'production';
    process.env.SCRAPIDOU_TOKEN = ` ${'f'.repeat(64)}\n`;
    expect(getConfig().apiToken).toBe('f'.repeat(64));
  });

  it('serves without a token outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SCRAPIDOU_TOKEN;
    expect(getConfig().apiToken).toBeUndefined();
  });

  it('treats an empty token as no token', () => {
    process.env.NODE_ENV = 'production';
    process.env.SCRAPIDOU_TOKEN = '  ';
    delete process.env.SCRAPIDOU_ALLOW_ANONYMOUS;
    expect(() => getConfig()).toThrow(/SCRAPIDOU_TOKEN is required/);
  });

  it('refuses a short token', () => {
    process.env.NODE_ENV = 'development';
    process.env.SCRAPIDOU_TOKEN = 'secret';
    expect(() => getConfig()).toThrow(/at least 32 characters/);
  });
});
