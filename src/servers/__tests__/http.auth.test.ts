import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { resetConfig } from '../../config.js';
import { createHttpServer } from '../http.js';

const TOKEN = 'c0ffee'.repeat(11);
const LIST_TOOLS = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const MCP_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

let server: Server;
let base: string;
let savedToken: string | undefined;

beforeAll(async () => {
  savedToken = process.env.SCRAPIDOU_TOKEN;
  process.env.SCRAPIDOU_TOKEN = TOKEN;
  resetConfig();
  server = createHttpServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (savedToken === undefined) delete process.env.SCRAPIDOU_TOKEN;
  else process.env.SCRAPIDOU_TOKEN = savedToken;
  resetConfig();
});

describe('HTTP server with SCRAPIDOU_TOKEN', () => {
  it.each(['/mcp', '/'])('refuses POST %s without a token (401, JSON-RPC error)', async (path) => {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: MCP_HEADERS, body: LIST_TOOLS });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer realm="scrapidou"');
    const body = await res.json();
    expect(body.error.code).toBe(-32001);
  });

  it('refuses GET /mcp without a token', async () => {
    const res = await fetch(`${base}/mcp`, { headers: { Accept: 'text/event-stream' } });
    expect(res.status).toBe(401);
  });

  it('refuses a wrong token', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${'0'.repeat(66)}` },
      body: LIST_TOOLS,
    });
    expect(res.status).toBe(401);
  });

  it('answers with the token', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${TOKEN}` },
      body: LIST_TOOLS,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"fetch_url"');
  });

  it('keeps /health open', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  it('keeps the CORS preflight open and allows the authorization header', async () => {
    const res = await fetch(`${base}/mcp`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-headers')).toContain('authorization');
  });
});
