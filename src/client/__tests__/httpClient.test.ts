import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchPage } from '../httpClient.js';
import { InvalidInputError } from '../../utils/errors.js';

// Un service interne : la réponse ne doit jamais sortir, la requête jamais partir.
let server: http.Server;
let port = 0;
let hits = 0;

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    hits++;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body><p>secret interne</p></body></html>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

afterEach(() => {
  delete process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK;
});

describe('fetchPage — protection SSRF', () => {
  it('refuses an internal service, whatever the way the address is written, without sending the request', async () => {
    const before = hits;
    for (const url of [
      `http://127.0.0.1:${port}/`,
      `http://2130706433:${port}/`,
      `http://[::ffff:127.0.0.1]:${port}/`,
      `http://localhost:${port}/`, // nom résolu vers la boucle locale : refusé à la connexion
      'http://169.254.169.254/latest/meta-data/',
    ]) {
      await expect(fetchPage(url, 5000), url).rejects.toThrow(/Blocked URL/);
      await expect(fetchPage(url, 5000), url).rejects.toBeInstanceOf(InvalidInputError);
    }
    expect(hits).toBe(before);
  });

  it('reads a local page when SCRAPIDOU_ALLOW_PRIVATE_NETWORK=true', async () => {
    process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK = 'true';
    const page = await fetchPage(`http://127.0.0.1:${port}/`, 5000);
    expect(page.statusCode).toBe(200);
    expect(page.html).toContain('secret interne');
  });
});
