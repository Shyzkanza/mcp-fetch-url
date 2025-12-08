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
import { formatErrorForMCP } from '../utils/errors.js';

/**
 * Crée et configure un serveur MCP stdio
 */
export function createStdioServer(): Server {
  const server = new Server(
    {
      name: 'scrapidou',
      version: '1.1.0',
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
      tools: [
        {
          name: 'fetch_url',
          description:
            'Fetch and extract content from a web page. Use this tool when the user wants to read, analyze, summarize, or get information from a URL. ' +
            'Supports flexible extraction: choose between text or HTML format, control content length for quick mapping vs complete analysis, configure issue detection, and configure link extraction. ' +
            'Perfect for both quick summaries (with maxContentLength) and deep analysis (without limit). ' +
            'Do NOT use this tool to scrape all links from a website or for automated bulk scraping.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description:
                  'The URL of the web page to fetch and extract content from. ' +
                  'Must be a valid HTTP or HTTPS URL (e.g., "https://example.com/article" or "http://blog.example.com/post"). ' +
                  'The tool will follow redirects automatically and handle common HTTP errors gracefully.',
              },
              contentFormat: {
                type: 'string',
                enum: ['text', 'html', 'both'],
                description:
                  'Content format determines what type of content is returned. ' +
                  'Use "text" (default) for clean, readable text content without HTML tags - best for LLM analysis, summarization, and general content understanding. ' +
                  'Use "html" for full HTML content preserving formatting, structure, images, and links - best for technical analysis, preserving document structure, or when you need the exact HTML structure. ' +
                  'Use "both" to get both text and HTML content in the same response - useful when you need both formats for different purposes. ' +
                  'Note: When set to "html" or "both", the tool automatically extracts HTML internally. ' +
                  'Default: "text".',
              },
              maxContentLength: {
                type: 'number',
                description:
                  'Maximum number of characters to extract from the content (applies to both text and HTML). ' +
                  'Use this parameter for quick mapping, summaries, or when you only need a preview of the content. ' +
                  'Leave undefined (default) to extract the complete content without any limit - use for complete analysis, deep understanding, or when you need all the information. ' +
                  'Recommended values: 500-1000 for quick summaries/mapping, 2000-5000 for detailed previews, undefined for complete content. ' +
                  'Default: undefined (no limit - complete content extraction).',
              },
              detectIssues: {
                type: 'boolean',
                description:
                  'Whether to detect issues on the page like paywalls, login requirements, or partial content. ' +
                  'When true (default), the tool analyzes the page to detect if content is behind a paywall, requires login, or is only partially loaded. ' +
                  'Use true for general use cases when you want to know if there are access issues with the content. ' +
                  'Use false to skip issue detection for faster extraction or when you know the content is freely accessible. ' +
                  'Default: true.',
              },
              extractRelatedLinks: {
                type: 'boolean',
                description:
                  'Whether to extract contextual links from the page. ' +
                  'When true (default), extracts links like "See also", "Related articles", "Read more", etc. - these are contextual links that provide additional relevant content. ' +
                  'Use true for articles, blog posts, Wikipedia pages, news sites, or any content with related material. ' +
                  'Use false to skip related links extraction for better performance or when you only need the main content. ' +
                  'Default: true.',
              },
              extractNavigationLinks: {
                type: 'boolean',
                description:
                  'Whether to extract links from sidebar/navigation menus. ' +
                  'When true, extracts links from navigation bars, sidebars, menus, and table of contents - useful for understanding site structure and finding related pages. ' +
                  'Use true for documentation sites (React, Vue, technical docs), structured websites with navigation menus, or when you need to understand the site structure. ' +
                  'Use false (default) for simple articles, blog posts, or when navigation links are not relevant. ' +
                  'Default: false.',
              },
            },
            required: ['url'],
          },
        },
      ],
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

          const contentFormat = (args.contentFormat as 'text' | 'html' | 'both' | undefined) || 'text';
          const maxContentLength = args.maxContentLength as number | undefined;
          const detectIssues = args.detectIssues !== false; // default: true
          const extractRelatedLinks = args.extractRelatedLinks !== false; // default: true
          const extractNavigationLinks = args.extractNavigationLinks === true; // default: false

          const result = await fetchUrl({
            url,
            contentFormat,
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

          if (result.issues && result.issues.length > 0) {
            output += `\n⚠️  Issues detected:\n`;
            result.issues.forEach((issue) => {
              output += `   - [${issue.type}] ${issue.message}\n`;
            });
          }

          if (result.relatedLinks && result.relatedLinks.length > 0) {
            output += `\n🔗 Related links (${result.relatedLinks.length}):\n`;
            result.relatedLinks.slice(0, 10).forEach((link, index) => {
              output += `   ${index + 1}. [${link.type}] ${link.text}\n      ${link.url}\n`;
            });
            if (result.relatedLinks.length > 10) {
              output += `   ... and ${result.relatedLinks.length - 10} more\n`;
            }
          }

          if (result.navigationLinks && result.navigationLinks.length > 0) {
            output += `\n🧭 Navigation links (${result.navigationLinks.length}):\n`;
            result.navigationLinks.slice(0, 15).forEach((link, index) => {
              const level = link.level ? ` (Level ${link.level})` : '';
              output += `   ${index + 1}. ${link.text}${level}\n      ${link.url}\n`;
            });
            if (result.navigationLinks.length > 15) {
              output += `   ... and ${result.navigationLinks.length - 15} more\n`;
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

