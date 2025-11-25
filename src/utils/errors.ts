/**
 * Gestion centralisée des erreurs pour Scrapidou
 */

import { ErrorCode, MCPError } from '../types.js';

/**
 * Classe de base pour les erreurs personnalisées
 */
export class ScrapidouError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ScrapidouError';
    Object.setPrototypeOf(this, ScrapidouError.prototype);
  }

  /**
   * Convertit l'erreur en format MCP
   */
  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Erreur pour les inputs invalides
 */
export class InvalidInputError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.INVALID_INPUT, message, details);
    this.name = 'InvalidInputError';
  }
}

/**
 * Erreur pour les erreurs API externes
 */
export class APIError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.API_ERROR, message, details);
    this.name = 'APIError';
  }
}

/**
 * Erreur pour les erreurs réseau
 */
export class NetworkError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

/**
 * Erreur pour les ressources non trouvées
 */
export class NotFoundError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NOT_FOUND, message, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Erreur pour les limites de taux dépassées
 */
export class RateLimitError extends ScrapidouError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.RATE_LIMIT, message, details);
    this.name = 'RateLimitError';
  }
}

/**
 * Formate une erreur pour la réponse MCP
 */
export function formatErrorForMCP(error: unknown): string {
  if (error instanceof ScrapidouError) {
    const mcpError = error.toMCPError();
    let message = `Error [${mcpError.code}]: ${mcpError.message}`;
    if (mcpError.details) {
      message += `\nDetails: ${JSON.stringify(mcpError.details, null, 2)}`;
    }
    return message;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unknown error: ${String(error)}`;
}

/**
 * Vérifie si une erreur est une erreur réseau (timeout, connexion, etc.)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }

  return false;
}

