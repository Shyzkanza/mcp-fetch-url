/**
 * Serveur MCP HTTP avec Streamable HTTP Transport
 * 
 * Utilise le SDK MCP officiel (Server + StreamableHTTPServerTransport)
 * pour support complet de structuredContent et alignement avec les standards MCP.
 * 
 * Endpoints:
 * - GET/POST /mcp ou / : Endpoint Streamable HTTP unifié
 * - GET /health : Health check
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { getServerConfig } from '../config.js';
import { fetchUrl } from '../tools/fetchUrl.js';

// Path pour Streamable HTTP (unifié)
const MCP_PATH = '/mcp';

// Définition du tool MCP au format SDK
const fetchUrlTool: Tool = {
  name: 'fetch_url',
  description:
    'Fetch and extract content from a web page. Use this tool when the user wants to read, analyze, or get information from a URL. ' +
    'Supports three modes: "light" for quick summaries, "standard" (default) for full text with links, "full" for complete HTML. ' +
    'Do NOT use this tool to scrape all links from a website.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description:
          'The URL of the web page to fetch and extract content from (must be http:// or https://)',
      },
      mode: {
        type: 'string',
        enum: ['light', 'standard', 'full'],
        description:
          'Extraction mode. Use "light" for simple conversations and quick summaries. Use "standard" (default) when you need links, images, related content, or detailed information. Use "full" only for technical/development purposes. Default: standard.',
      },
      extractRelatedLinks: {
        type: 'boolean',
        description:
          'Extract contextual links like "See also", "Related articles", etc. (default: true). Use for articles, blog posts, Wikipedia pages.',
      },
      extractNavigationLinks: {
        type: 'boolean',
        description:
          'Extract links from sidebar/navigation menus (default: false). Use for documentation sites, technical docs, or structured websites. Not needed for simple articles.',
      },
    },
    required: ['url'],
  },
  annotations: {
    readOnlyHint: true,
  },
};

/**
 * Crée une instance du serveur MCP
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'scrapidou',
      version: '1.0.3',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Handler: List tools
  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
    tools: [fetchUrlTool],
  }));

  // Handler: List resources
  server.setRequestHandler(ListResourcesRequestSchema, async (_request: ListResourcesRequest) => ({
    resources: [],
  }));

  // Handler: Read resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // Handler: Call tool
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const toolName = request.params.name;
    const toolArgs = request.params.arguments ?? {};

    console.log(`[MCP] Tool call: ${toolName}`, JSON.stringify(toolArgs).substring(0, 100));

    if (toolName === 'fetch_url') {
      const args = toolArgs as {
        url?: string;
        mode?: 'light' | 'standard' | 'full';
        extractRelatedLinks?: boolean;
        extractNavigationLinks?: boolean;
      };

      if (!args || !args.url) {
        throw new Error('url parameter is required');
      }

      const toolResult = await fetchUrl({
        url: args.url,
        mode: args.mode,
        extractRelatedLinks: args.extractRelatedLinks,
        extractNavigationLinks: args.extractNavigationLinks,
      });

      // Format pour ChatGPT (JSON structuré)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(toolResult, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  });

  return server;
}

/**
 * Handler Streamable HTTP (GET/POST /mcp)
 */
async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  // CORS headers (importants pour les clients navigateur)
  const origin = req.headers.origin;
  const config = getServerConfig();
  const allowedOrigin = config.corsOrigin === '*' ? origin : config.corsOrigin;

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id'); // ⚠️ IMPORTANT pour CORS

  const server = createMcpServer();
  
  // Créer le transport (stateless pour simplicité)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Mode stateless
  });

  // Connecter le serveur au transport
  await server.connect(transport);

  // Parser le body si c'est une requête POST
  let parsedBody: unknown = undefined;
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }
    try {
      parsedBody = body ? JSON.parse(body) : undefined;
    } catch (e) {
      // Ignorer les erreurs de parsing, le transport gérera
    }
  }

  // Gérer la requête
  try {
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error('[StreamableHTTP] Failed to handle request:', error);
    if (!res.headersSent) {
      res.writeHead(500).end('Failed to handle Streamable HTTP request');
    }
  }
}

/**
 * Crée et configure le serveur HTTP
 */
export function createHttpServer() {
  const config = getServerConfig();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end('Missing URL');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    // Handle OPTIONS (preflight CORS)
    if (
      req.method === 'OPTIONS' &&
      (url.pathname === MCP_PATH || url.pathname === '/')
    ) {
      const origin = req.headers.origin;
      const allowedOrigin = config.corsOrigin === '*' ? origin : config.corsOrigin;

      res.writeHead(204, {
        'Access-Control-Allow-Origin': allowedOrigin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id',
      });
      res.end();
      return;
    }

    // Health check
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(
          JSON.stringify({
            status: 'ok',
            service: 'scrapidou',
            version: '1.0.3',
            transport: 'streamable-http',
          })
        );
      }
      return;
    }

    // Streamable HTTP endpoint (GET et POST /mcp ou / - unifié)
    // ChatGPT peut accéder à la racine, donc on accepte aussi /
    if ((req.method === 'GET' || req.method === 'POST') && (url.pathname === MCP_PATH || url.pathname === '/')) {
      await handleMcpRequest(req, res);
      return;
    }

    // 404 for other routes
    res.writeHead(404).end('Not Found');
  });

  server.on('clientError', (err: Error, socket) => {
    console.error('[HTTP] Client error:', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  return server;
}

/**
 * Démarre le serveur HTTP MCP
 */
export async function startHttpServer(): Promise<void> {
  const config = getServerConfig();
  const server = createHttpServer();

  return new Promise((resolve) => {
    server.listen(config.port, () => {
      console.log(`Scrapidou MCP Server (Streamable HTTP) running on http://localhost:${config.port}`);
      console.log(`  Health check: GET http://localhost:${config.port}/health`);
      console.log(`  MCP endpoint: GET/POST http://localhost:${config.port}${MCP_PATH}`);
      resolve();
    });
  });
}
