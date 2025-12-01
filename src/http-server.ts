#!/usr/bin/env node
/**
 * Entry point pour Scrapidou HTTP Server (ChatGPT)
 * 
 * Délègue à src/servers/http.ts
 */

// ⚠️ IMPORTANT: Charger le polyfill AVANT tout autre import
import './polyfill-file.js';

import { startHttpServer } from './servers/http.js';

startHttpServer().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

