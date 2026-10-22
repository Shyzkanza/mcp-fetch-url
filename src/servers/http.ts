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

import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

const VERSION = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
).version as string;

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
} from '@modelcontextprotocol/sdk/types.js';

import { getServerConfig } from '../config.js';
import { fetchUrl } from '../tools/fetchUrl.js';
import { fetchUrlTool } from '../tools/fetchUrlSchema.js';

// Path pour Streamable HTTP (unifié)
const MCP_PATH = '/mcp';

/**
 * Crée une instance du serveur MCP
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'scrapidou',
      version: VERSION,
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
        contentFormat?: 'text' | 'html' | 'markdown' | 'both';
        maxContentLength?: number;
        detectIssues?: boolean;
        extractRelatedLinks?: boolean;
        extractNavigationLinks?: boolean;
      };

      if (!args || !args.url) {
        throw new Error('url parameter is required');
      }

      // Déterminer les paramètres
      const contentFormat = args.contentFormat || 'text';
      const maxContentLength = args.maxContentLength; // undefined = no limit
      const detectIssues = args.detectIssues !== false; // default: true
      const extractRelatedLinks = args.extractRelatedLinks !== false; // default: true
      const extractNavigationLinks = args.extractNavigationLinks === true; // default: false
      
      // Le mode est maintenant déterminé automatiquement dans fetchUrl selon contentFormat
      const toolResult = await fetchUrl({
        url: args.url,
        contentFormat: contentFormat,
        maxContentLength: maxContentLength,
        detectIssues: detectIssues,
        extractRelatedLinks: extractRelatedLinks,
        extractNavigationLinks: extractNavigationLinks,
      });

      // Format pour ChatGPT : structuredContent avec contenu complet
      // Pas de widget, donc pas besoin de _meta complexe
      // Le contenu complet est dans structuredContent selon contentFormat
      
      let summary = `📄 Content extracted from: ${args.url}\n`;
      if (contentFormat) {
        summary += `📝 Format: ${contentFormat}\n`;
      }
      if (maxContentLength !== undefined) {
        summary += `✂️  Max length: ${maxContentLength} characters\n`;
      }
      if (!detectIssues) {
        summary += `⚡ Fast mode: issue detection disabled\n`;
      }
      summary += '\n';
      
      if (toolResult.metadata?.title) {
        summary += `📌 **Title**: ${toolResult.metadata.title}\n`;
      }
      if (toolResult.metadata?.description) {
        summary += `📝 **Description**: ${toolResult.metadata.description}\n`;
      }
      if (toolResult.metadata?.author) {
        summary += `✍️  **Author**: ${toolResult.metadata.author}\n`;
      }
      if (toolResult.metadata?.publishedDate) {
        summary += `📅 **Published**: ${toolResult.metadata.publishedDate}\n`;
      }
      
      if (toolResult.contentText) {
        summary += `\n📊 Text content: ${toolResult.contentText.length} characters\n`;
      }
      
      if (toolResult.contentHTML) {
        summary += `\n📄 HTML content: ${toolResult.contentHTML.length} characters\n`;
      }

      if (toolResult.contentMarkdown) {
        summary += `\n📋 Markdown content: ${toolResult.contentMarkdown.length} characters\n`;
      }
      
      if (toolResult.issues && toolResult.issues.length > 0) {
        summary += `\n⚠️  **Issues detected**: ${toolResult.issues.length}\n`;
        toolResult.issues.forEach((issue) => {
          summary += `   - ${issue.type}: ${issue.message}\n`;
        });
      }
      
      if (toolResult.relatedLinks && toolResult.relatedLinks.length > 0) {
        summary += `\n🔗 **Related links**: ${toolResult.relatedLinks.length} found\n`;
      }
      
      if (toolResult.navigationLinks && toolResult.navigationLinks.length > 0) {
        summary += `\n🧭 **Navigation links**: ${toolResult.navigationLinks.length} found\n`;
      }
      
      // Préparer structuredContent avec contenu selon contentFormat et maxContentLength
      const structuredContent: Record<string, unknown> = {
        type: 'webpage',
        url: args.url,
        contentFormat: contentFormat,
        metadata: toolResult.metadata,
        issues: detectIssues ? (toolResult.issues || []) : [],
        relatedLinks: toolResult.relatedLinks || [],
        navigationLinks: toolResult.navigationLinks || [],
      };
      
      // Ajouter le contenu selon le format demandé, avec limite si spécifiée
      if (contentFormat === 'text' || contentFormat === 'both') {
        let contentText = toolResult.contentText || '';
        const originalTextLength = contentText.length;
        
        // Appliquer la limite si spécifiée
        if (maxContentLength !== undefined && maxContentLength > 0 && contentText.length > maxContentLength) {
          contentText = contentText.substring(0, maxContentLength);
          structuredContent.contentTextTruncated = true;
        } else {
          structuredContent.contentTextTruncated = false;
        }
        
        structuredContent.contentText = contentText;
        structuredContent.contentTextLength = originalTextLength;
        structuredContent.contentTextExtractedLength = contentText.length;
      }
      
      if (contentFormat === 'html' || contentFormat === 'both') {
        let contentHTML = toolResult.contentHTML || '';
        const originalHTMLLength = contentHTML.length;

        // Appliquer la limite si spécifiée
        if (maxContentLength !== undefined && maxContentLength > 0 && contentHTML.length > maxContentLength) {
          contentHTML = contentHTML.substring(0, maxContentLength);
          structuredContent.contentHTMLTruncated = true;
        } else {
          structuredContent.contentHTMLTruncated = false;
        }

        structuredContent.contentHTML = contentHTML;
        structuredContent.contentHTMLLength = originalHTMLLength;
        structuredContent.contentHTMLExtractedLength = contentHTML.length;
      }

      if (contentFormat === 'markdown') {
        let contentMarkdown = toolResult.contentMarkdown || '';
        const originalMdLength = contentMarkdown.length;

        if (maxContentLength !== undefined && maxContentLength > 0 && contentMarkdown.length > maxContentLength) {
          contentMarkdown = contentMarkdown.substring(0, maxContentLength);
          structuredContent.contentMarkdownTruncated = true;
        } else {
          structuredContent.contentMarkdownTruncated = false;
        }

        structuredContent.contentMarkdown = contentMarkdown;
        structuredContent.contentMarkdownLength = originalMdLength;
        structuredContent.contentMarkdownExtractedLength = contentMarkdown.length;
      }
      
      // Ajouter l'info sur la limite si elle a été appliquée
      if (maxContentLength !== undefined) {
        structuredContent.maxContentLength = maxContentLength;
      }
      
      // Format pour ChatGPT : content et structuredContent contiennent les mêmes données
      // content : JSON stringifié (pour compatibilité et fallback)
      // structuredContent : JSON object (pour utilisation directe)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2),
          },
        ],
        structuredContent,
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
            version: VERSION,
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
