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

  return {
    port,
    nodeEnv,
    corsOrigin,
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

