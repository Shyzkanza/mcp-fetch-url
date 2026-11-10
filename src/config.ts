/**
 * Configuration centralisée pour Scrapidou
 */

import { ServerConfig } from './types.js';

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  nodeEnv: 'development',
  corsOrigin: '*',
};

/** Longueur minimale du jeton (`openssl rand -hex 32` en donne 64 caractères). */
const MIN_TOKEN_LENGTH = 32;

/**
 * Valide et récupère la configuration depuis les variables d'environnement
 */
export function getConfig(): ServerConfig {
  const port = parseInt(process.env.PORT || String(DEFAULT_CONFIG.port), 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535.`);
  }

  const nodeEnv = process.env.NODE_ENV || DEFAULT_CONFIG.nodeEnv;
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test.`);
  }

  // CORS origin (par défaut permissif en dev, restrictif en prod)
  const corsOrigin =
    process.env.CORS_ORIGIN ||
    (nodeEnv === 'production' ? 'https://chatgpt.com' : DEFAULT_CONFIG.corsOrigin);

  // Jeton d'accès à /mcp. Exigé en production : sans lui, le serveur lit n'importe quelle page pour n'importe
  // qui, depuis l'IP du VPS. SCRAPIDOU_ALLOW_ANONYMOUS=true sert sans jeton, en connaissance de cause.
  const apiToken = process.env.SCRAPIDOU_TOKEN?.trim() || undefined;
  if (apiToken && apiToken.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `Invalid SCRAPIDOU_TOKEN: at least ${MIN_TOKEN_LENGTH} characters (generate one with: openssl rand -hex 32).`
    );
  }
  if (!apiToken && nodeEnv === 'production' && process.env.SCRAPIDOU_ALLOW_ANONYMOUS !== 'true') {
    throw new Error(
      'SCRAPIDOU_TOKEN is required in production. Set SCRAPIDOU_ALLOW_ANONYMOUS=true to serve without authentication.'
    );
  }

  return {
    port,
    nodeEnv,
    corsOrigin,
    apiToken,
  };
}

/**
 * Configuration globale (singleton)
 */
let config: ServerConfig | null = null;

/**
 * Récupère la configuration (singleton pattern)
 */
export function getServerConfig(): ServerConfig {
  if (!config) {
    config = getConfig();
  }
  return config;
}

/**
 * Réinitialise la configuration (utile pour les tests)
 */
export function resetConfig(): void {
  config = null;
}

