#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const SERVER_URL = process.argv[2] || 'https://scrapidou.rankorr.red/mcp';

// Proxy HTTP MCP server to stdio for Cursor
const server = new McpServer({
  name: 'scrapidou-http-proxy',
      version: '1.2.0',
});

// Forward all requests to HTTP server
async function forwardRequest(method: string, params?: any) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.result;
}

// List tools
server.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return await forwardRequest('tools/list');
});

// Call tool
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await forwardRequest('tools/call', request.params);
});

// List resources
server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return await forwardRequest('resources/list');
});

// Read resource
server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await forwardRequest('resources/read', request.params);
});

// Start stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`HTTP proxy connected to ${SERVER_URL}`);
}

main().catch(console.error);
