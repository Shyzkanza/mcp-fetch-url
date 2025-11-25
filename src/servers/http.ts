/**
 * Serveur MCP HTTP pour Scrapidou (ChatGPT)
 */

import http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerConfig } from '../config.js';

/**
 * Démarre le serveur HTTP MCP
 */
export async function startHttpServer(): Promise<void> {
  const config = getServerConfig();

  const mcpServer = new Server(
    {
      name: 'scrapidou',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handler pour lister les outils disponibles
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [],
    };
  });

  // Handler pour appeler un outil
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    throw new Error(`Unknown tool: ${name}`);
  });

  // Créer le serveur HTTP
  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    const origin = req.headers.origin || '*';
    const allowedOrigins = [
      'https://chatgpt.com',
      'https://chat.openai.com',
      config.corsOrigin || '*',
    ];

    if (allowedOrigins.includes(origin) || config.corsOrigin === '*') {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'scrapidou',
          version: '1.0.0',
        })
      );
      return;
    }

    // MCP endpoint
    if (req.url === '/mcp') {
      if (req.method === 'GET') {
        // SSE connection
        const transport = new SSEServerTransport('/mcp', res);
        await mcpServer.connect(transport);
        return;
      }

      if (req.method === 'POST') {
        // JSON-RPC request
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const jsonRpcRequest = JSON.parse(body);
            const transport = new SSEServerTransport('/mcp', res);
            await mcpServer.connect(transport);

            // Process the request
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id: jsonRpcRequest.id, result: {} }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal error' },
              })
            );
          }
        });
        return;
      }
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(config.port, () => {
    console.log(`Scrapidou MCP Server running on http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
    console.log(`MCP endpoint: http://localhost:${config.port}/mcp`);
  });
}

