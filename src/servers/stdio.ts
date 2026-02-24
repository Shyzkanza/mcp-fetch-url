/**
 * Serveur MCP stdio - Pour IDEs (Cursor, Claude Desktop, etc.)
 * 
 * Réutilise les tools sans logique métier
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { fetchUrl } from '../tools/fetchUrl.js';
import { fetchUrlTool } from '../tools/fetchUrlSchema.js';
import { formatErrorForMCP } from '../utils/errors.js';

/**
 * Crée et configure un serveur MCP stdio
 */
export function createStdioServer(): Server {
  const server = new Server(
    {
      name: 'scrapidou',
      version: '2.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Enregistrer les tools disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [fetchUrlTool],
    };
  });

  // Handler pour les appels de tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('No arguments provided');
    }

    try {
      switch (name) {
        case 'fetch_url': {
          const url = args.url as string;
          if (!url) {
            throw new Error('url parameter is required');
          }

          const contentFormat = (args.contentFormat as 'text' | 'html' | 'markdown' | 'both' | undefined) || 'text';
          const maxContentLength = args.maxContentLength as number | undefined;
          const detectIssues = args.detectIssues !== false; // default: true
          const extractRelatedLinks = args.extractRelatedLinks !== false; // default: true
          const extractNavigationLinks = args.extractNavigationLinks === true; // default: false

          const result = await fetchUrl({
            url,
            contentFormat,
            maxContentLength,
            detectIssues,
            extractRelatedLinks,
            extractNavigationLinks,
          });

          // Formatage pour MCP (texte lisible)
          let output = `📄 Content extracted from: ${url}\n`;
          if (contentFormat) {
            output += `📝 Format: ${contentFormat}\n`;
          }
          if (maxContentLength !== undefined) {
            output += `✂️  Max length: ${maxContentLength} characters\n`;
          }
          if (!detectIssues) {
            output += `⚡ Fast mode: issue detection disabled\n`;
          }
          output += '\n';

          if (result.metadata?.title) {
            output += `📌 Title: ${result.metadata.title}\n`;
          }
          if (result.metadata?.description) {
            output += `📝 Description: ${result.metadata.description}\n`;
          }
          if (result.metadata?.author) {
            output += `✍️  Author: ${result.metadata.author}\n`;
          }

          if (result.contentText) {
            output += `\n📊 Text content length: ${result.contentText.length} characters\n`;
          }

          if (result.contentHTML) {
            output += `\n📄 HTML content length: ${result.contentHTML.length} characters\n`;
          }

          if (result.contentMarkdown) {
            output += `\n📋 Markdown content length: ${result.contentMarkdown.length} characters\n`;
          }

          if (result.issues && result.issues.length > 0) {
            output += `\n⚠️  Issues detected:\n`;
            result.issues.forEach((issue) => {
              output += `   - [${issue.type}] ${issue.message}\n`;
            });
          }

          if (result.relatedLinks && result.relatedLinks.length > 0) {
            output += `\n🔗 Related links (${result.relatedLinks.length}):\n`;
            result.relatedLinks.slice(0, 30).forEach((link, index) => {
              output += `   ${index + 1}. [${link.type}] ${link.text}\n      ${link.url}\n`;
            });
            if (result.relatedLinks.length > 30) {
              output += `   ... and ${result.relatedLinks.length - 30} more\n`;
            }
          }

          if (result.navigationLinks && result.navigationLinks.length > 0) {
            output += `\n🧭 Navigation links (${result.navigationLinks.length}):\n`;
            result.navigationLinks.slice(0, 50).forEach((link, index) => {
              const level = link.level ? ` (Level ${link.level})` : '';
              output += `   ${index + 1}. ${link.text}${level}\n      ${link.url}\n`;
            });
            if (result.navigationLinks.length > 50) {
              output += `   ... and ${result.navigationLinks.length - 50} more\n`;
            }
          }

          // Afficher le contenu texte (toujours disponible si contentFormat: 'text' ou 'both')
          if (result.contentText) {
            const displayLength = maxContentLength ? Math.min(maxContentLength, 5000) : 5000;
            const textToShow = result.contentText.substring(0, displayLength);
            output += `\n📝 Text Content:\n${textToShow}`;
            if (result.contentText.length > displayLength) {
              output += `\n\n... (${result.contentText.length - displayLength} more characters)`;
            }
          }

          // Afficher le Markdown si contentFormat: 'markdown'
          if (result.contentMarkdown) {
            const displayLength = maxContentLength ? Math.min(maxContentLength, 5000) : 5000;
            const mdToShow = result.contentMarkdown.substring(0, displayLength);
            output += `\n\n📋 Markdown Content:\n${mdToShow}`;
            if (result.contentMarkdown.length > displayLength) {
              output += `\n\n... (${result.contentMarkdown.length - displayLength} more characters)`;
            }
          }

          // Afficher le HTML si contentFormat: 'html' ou 'both'
          if (result.contentHTML) {
            const displayLength = maxContentLength ? Math.min(maxContentLength, 2000) : 2000;
            const htmlToShow = result.contentHTML.substring(0, displayLength);
            output += `\n\n📄 HTML Content (truncated):\n${htmlToShow}`;
            if (result.contentHTML.length > displayLength) {
              output += `\n\n... (${result.contentHTML.length - displayLength} more characters)`;
            }
          }

          return {
            content: [{ type: 'text', text: output }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForMCP(error),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Démarre le serveur stdio
 */
export async function startStdioServer(): Promise<void> {
  const server = createStdioServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scrapidou MCP Server running on stdio');
}

