#!/usr/bin/env node
/**
 * Client npm : relaie en stdio (Cursor, Claude Desktop…) le serveur HTTP de Scrapidou.
 *
 * - URL du serveur : premier argument, sinon le serveur hébergé.
 * - Jeton : variable d'environnement SCRAPIDOU_TOKEN, envoyée en `Authorization: Bearer`.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const SERVER_URL = process.argv[2] || 'https://scrapidou.rankorr.red/mcp';
const TOKEN = process.env.SCRAPIDOU_TOKEN?.trim();

// Proxy HTTP MCP server to stdio for Cursor
const server = new Server(
  {
    name: 'scrapidou-http-proxy',
    version: '2.3.2',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * La réponse arrive en JSON ou en flux SSE (`data: {...}`, ce que rend le transport Streamable HTTP) :
 * on garde le dernier message JSON-RPC.
 */
async function readJsonRpc(response: Response): Promise<any> {
  const text = await response.text();
  if (!(response.headers.get('content-type') ?? '').includes('text/event-stream')) {
    return JSON.parse(text);
  }
  let message: any;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('data:') && line.slice(5).trim()) {
      message = JSON.parse(line.slice(5).trim());
    }
  }
  if (message === undefined) {
    throw new Error(`Empty response from ${SERVER_URL}`);
  }
  return message;
}

// Forward all requests to HTTP server
async function forwardRequest(method: string, params?: any) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Le transport Streamable HTTP refuse (406) un client qui n'accepte pas les deux
      Accept: 'application/json, text/event-stream',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (response.status === 401) {
    throw new Error(
      TOKEN
        ? `${SERVER_URL} refused the token in SCRAPIDOU_TOKEN (401)`
        : `${SERVER_URL} requires a token: set SCRAPIDOU_TOKEN (401)`
    );
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await readJsonRpc(response);
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.result;
}

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return await forwardRequest('tools/list');
});

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await forwardRequest('tools/call', request.params);
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return await forwardRequest('resources/list');
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await forwardRequest('resources/read', request.params);
});

// Start stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`HTTP proxy connected to ${SERVER_URL}${TOKEN ? ' (with token)' : ''}`);
}

main().catch(console.error);
