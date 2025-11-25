/**
 * Gestion centralisée des erreurs pour Scrapidou
 */

import { ErrorCode, MCPError } from '../types.js';

/**
 * Classe de base pour les erreurs personnalisées
 */
export class ScrapidouError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ScrapidouError';
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Erreur de validation des entrées
 */
export class ValidationError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.INVALID_INPUT, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Erreur réseau
 */
export class NetworkError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

/**
 * Erreur API externe
 */
export class APIError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.API_ERROR, message, details);
    this.name = 'APIError';
  }
}

/**
 * Formatte une erreur pour la réponse MCP
 */
export function formatError(error: unknown): MCPError {
  if (error instanceof ScrapidouError) {
    return error.toMCPError();
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message,
      details: error.stack,
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    details: error,
  };
}

