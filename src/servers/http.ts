/**
 * Serveur MCP HTTP - Pour ChatGPT (JSON-RPC 2.0)
 * 
 * Réutilise les tools sans logique métier
 */

import http from 'http';
import { getServerConfig } from '../config.js';
import { fetchUrl } from '../tools/fetchUrl.js';
import { formatErrorForMCP } from '../utils/errors.js';

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Crée et configure le serveur HTTP MCP
 */
export function createHttpServer(): http.Server {
  const config = getServerConfig();

  const server = http.createServer(async (req, res) => {
    // CORS headers
    const origin = req.headers.origin;
    const allowedOrigin = config.corsOrigin === '*' ? origin : config.corsOrigin;
    
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Healthcheck endpoint (only /health, not /)
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/health') {
      res.writeHead(200);
      if (req.method === 'HEAD') {
        res.end();
      } else {
              res.end(JSON.stringify({ status: 'ok', service: 'scrapidou', version: '1.0.2' }));
      }
      return;
    }

    // MCP discovery endpoint (GET /mcp or GET /)
    // ChatGPT peut accéder à / ou /mcp selon la configuration
    if (req.method === 'GET' && (req.url === '/mcp' || req.url === '/')) {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        result: {
          name: 'scrapidou',
                      version: '1.0.2',
          capabilities: {
            tools: {},
          },
          tools: [
            {
              name: 'fetch_url',
              description:
                'Fetch and extract content from a web page with three extraction modes optimized for different use cases. Choose the mode based on the conversation context and information needs.\n\n**WHEN TO USE EACH MODE:**\n\n- **light**: Use for simple conversations when you only need a quick summary or basic information. Perfect for answering questions like "What is this page about?" or "Give me a brief overview". Returns only metadata (title, description) and clean text content. Fastest and most token-efficient.\n\n- **standard** (default): Use when you need complete information including links, images references, related articles, and issue detection. Perfect for detailed analysis, finding related content, checking for paywalls, or when the user asks about links, images, or wants to explore the page further. Returns metadata, full text content, related links, navigation links (if requested), and detected issues.\n\n- **full**: Use only for advanced technical use cases like parsing HTML structure, API development, or when you need the complete HTML markup. Returns everything including the full HTML content. Most token-intensive, use sparingly.\n\n**GUIDELINES:**\n- Start with **light** mode for simple questions or quick summaries\n- Switch to **standard** mode when the user asks about links, images, related content, or needs detailed information\n- Use **full** mode only for technical/development purposes\n- Do not use this tool to automatically scrape all links from a website',
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
            },
          ],
        },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }

    // MCP JSON-RPC endpoint (POST /mcp or POST /)
    if (req.method === 'POST' && (req.url === '/mcp' || req.url === '/')) {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        let requestId: number | string | null = null;
        try {
          const request: JsonRpcRequest = JSON.parse(body);
          requestId = request.id;
          console.log(`[MCP] ${request.method}`, request.params ? JSON.stringify(request.params).substring(0, 100) : '');

          if (request.jsonrpc !== '2.0') {
            const response: JsonRpcResponse = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32600,
                message: 'Invalid Request',
                data: 'jsonrpc must be "2.0"',
              },
            };
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
            return;
          }

          let result: unknown;

          switch (request.method) {
            case 'initialize':
              result = {
                protocolVersion: '2025-06-18',
                capabilities: {
                  tools: {},
                },
                serverInfo: {
                  name: 'scrapidou',
                  version: '1.0.2',
                },
              };
              break;

            case 'notifications/initialized':
            case 'initialized':
              // Notification que le client est initialisé - retourner un résultat vide
              result = {};
              break;

            case 'tools/list':
              result = {
                tools: [
                  {
                    name: 'fetch_url',
                    description:
                      'Fetch and extract content from a web page with three extraction modes optimized for different use cases. Choose the mode based on the conversation context and information needs.\n\n**WHEN TO USE EACH MODE:**\n\n- **light**: Use for simple conversations when you only need a quick summary or basic information. Perfect for answering questions like "What is this page about?" or "Give me a brief overview". Returns only metadata (title, description) and clean text content. Fastest and most token-efficient.\n\n- **standard** (default): Use when you need complete information including links, images references, related articles, and issue detection. Perfect for detailed analysis, finding related content, checking for paywalls, or when the user asks about links, images, or wants to explore the page further. Returns metadata, full text content, related links, navigation links (if requested), and detected issues.\n\n- **full**: Use only for advanced technical use cases like parsing HTML structure, API development, or when you need the complete HTML markup. Returns everything including the full HTML content. Most token-intensive, use sparingly.\n\n**GUIDELINES:**\n- Start with **light** mode for simple questions or quick summaries\n- Switch to **standard** mode when the user asks about links, images, related content, or needs detailed information\n- Use **full** mode only for technical/development purposes\n- Do not use this tool to automatically scrape all links from a website',
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
                  },
                ],
              };
              break;

            case 'tools/call': {
              const params = request.params as { name: string; arguments?: unknown };
              if (!params || !params.name) {
                throw new Error('Tool name is required');
              }

              if (params.name === 'fetch_url') {
                const args = params.arguments as {
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
                result = {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(toolResult, null, 2),
                    },
                  ],
                };
              } else {
                throw new Error(`Unknown tool: ${params.name}`);
              }
              break;
            }

            default:
              console.log(`[MCP] Unknown method: ${request.method}`);
              // Return empty result for unknown methods instead of error
              // This prevents ChatGPT from getting stuck on unrecognized methods
              result = {};
          }

          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result,
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          // Try to extract id from body if parsing failed
          if (requestId === null && body) {
            try {
              const parsed = JSON.parse(body) as JsonRpcRequest;
              requestId = parsed.id || null;
            } catch {
              // Ignore parsing errors in error handler
            }
          }

          console.error('[MCP Error]', error);
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32603,
              message: 'Internal error',
              data: formatErrorForMCP(error),
            },
          };
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        }
      });
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}

/**
 * Démarre le serveur HTTP MCP
 */
export async function startHttpServer(): Promise<void> {
  const config = getServerConfig();
  const server = createHttpServer();

  server.listen(config.port, () => {
    console.log(`Scrapidou MCP Server running on http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
    console.log(`MCP endpoint: http://localhost:${config.port}/mcp`);
  });
}

