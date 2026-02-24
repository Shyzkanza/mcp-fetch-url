/**
 * Schema partagé du tool fetch_url
 * Importé par les deux serveurs (stdio + http) pour éviter la duplication
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const fetchUrlTool: Tool = {
  name: 'fetch_url',
  description:
    'Fetch and extract content from a web page. ' +
    'Use when the user provides a URL or asks to read/analyze web content. ' +
    'Returns text, markdown, or HTML with metadata, related links, and navigation links. ' +
    'Use maxContentLength for quick previews or leave unlimited for full extraction. ' +
    'Do NOT use for automated bulk scraping.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch (http/https). Follows redirects automatically.',
      },
      contentFormat: {
        type: 'string',
        enum: ['text', 'html', 'markdown', 'both'],
        description:
          'Output format. "text" (default): clean text with heading markers. ' +
          '"markdown": structured Markdown with links, code blocks, emphasis - best for LLM analysis. ' +
          '"html": full HTML preserving structure. "both": text + HTML together.',
      },
      maxContentLength: {
        type: 'number',
        description:
          'Max characters to extract. 500-1000 for summaries, 2000-5000 for previews, undefined (default) for complete content.',
      },
      detectIssues: {
        type: 'boolean',
        description: 'Detect paywalls, login walls, and partial content. Default: true.',
      },
      extractRelatedLinks: {
        type: 'boolean',
        description:
          'Extract "See also" and "Related articles" links from the page. Default: true.',
      },
      extractNavigationLinks: {
        type: 'boolean',
        description:
          'Extract sidebar/menu navigation links. Useful for documentation sites and site mapping. Default: false.',
      },
    },
    required: ['url'],
  },
  annotations: {
    readOnlyHint: true,
  },
};
