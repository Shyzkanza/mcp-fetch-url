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
      version: '1.0.0',
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
            'fetch_url récupère et extrait le contenu d\'une page web avec différents niveaux de détail via le paramètre mode. Mode light pour des réponses légères, mode standard pour un contenu textuel détaillé, mode full pour le HTML complet. Ne pas l\'utiliser pour scraper automatiquement tous les liens d\'un site.\n\nModes:\n- light: Retourne uniquement metadata, contentText (texte nettoyé), et navigationLinks si demandé. Réponse la plus courte possible.\n- standard (default): Retourne metadata, contentText, relatedLinks, navigationLinks, et issues. Pas de HTML brut.\n- full: Inclut tout (contentHTML, contentText, relatedLinks, navigationLinks, metadata, issues). Pour usages avancés (analyse API, parsing, dev).\n\nOptions:\n- extractRelatedLinks (default: true): Extract contextual links like "See also", "Related articles", etc. Use for articles, blog posts, Wikipedia pages.\n- extractNavigationLinks (default: false): Extract links from sidebar/navigation menus. Use for documentation sites, technical docs, or structured websites.',
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
                  'Extraction mode: light (minimal, text only), standard (text + links, default), full (HTML + all). Default: standard.',
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

          const mode = args.mode as 'light' | 'standard' | 'full' | undefined;
          const extractRelatedLinks = args.extractRelatedLinks as boolean | undefined;
          const extractNavigationLinks = args.extractNavigationLinks as boolean | undefined;

          const result = await fetchUrl({
            url,
            mode,
            extractRelatedLinks,
            extractNavigationLinks,
          });

          // Formatage pour MCP (texte lisible)
          let output = `📄 Content extracted from: ${url}\n`;
          if (mode) {
            output += `📋 Mode: ${mode}\n`;
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

          // Afficher le contenu texte (toujours disponible)
          if (result.contentText) {
            output += `\n📝 Text Content:\n${result.contentText.substring(0, 3000)}`;
            if (result.contentText.length > 3000) {
              output += `\n\n... (${result.contentText.length - 3000} more characters)`;
            }
          }

          // Afficher le HTML seulement en mode full (et tronqué)
          if (result.contentHTML) {
            output += `\n\n📄 HTML Content (truncated):\n${result.contentHTML.substring(0, 1000)}`;
            if (result.contentHTML.length > 1000) {
              output += `\n\n... (${result.contentHTML.length - 1000} more characters)`;
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

