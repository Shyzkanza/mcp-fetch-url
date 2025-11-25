/**
 * Types partagés pour Scrapidou
 */

// ============================================================================
// Types de configuration
// ============================================================================

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin?: string;
}

// ============================================================================
// Types d'erreurs
// ============================================================================

export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface MCPError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

