#!/usr/bin/env node
/**
 * Entry point pour Scrapidou stdio Server (IDEs)
 * 
 * Délègue à src/servers/stdio.ts
 */

import { startStdioServer } from './servers/stdio.js';

startStdioServer().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

