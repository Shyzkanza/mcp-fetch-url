/**
 * Serveur MCP Stdio pour Scrapidou (IDEs: Cursor, Claude Desktop, Warp)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Démarre le serveur MCP en mode stdio
 */
export async function startStdioServer(): Promise<void> {
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

  // Handler pour lister les outils disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [],
    };
  });

  // Handler pour appeler un outil
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    throw new Error(`Unknown tool: ${name}`);
  });

  // Démarrer le transport stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Scrapidou MCP Server running on stdio');
}

