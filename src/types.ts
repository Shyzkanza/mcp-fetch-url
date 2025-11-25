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

// ============================================================================
// Types pour le tool fetch_url
// ============================================================================

export interface FetchUrlInput {
  url: string;
  mode?: 'light' | 'standard' | 'full'; // Default: 'standard' - Extraction mode: light (minimal), standard (text + links), full (HTML + all)
  extractRelatedLinks?: boolean; // Default: true - Extract contextual links like "See also", "Related articles"
  extractNavigationLinks?: boolean; // Default: false - Extract links from sidebar/navigation menus (useful for documentation)
}

export interface RelatedLink {
  url: string;
  text: string;
  type: 'see_also' | 'related' | 'redirect';
}

export interface NavigationLink {
  url: string;
  text: string;
  level?: number; // Hierarchical level (1, 2, 3...) if available
}

export interface Issue {
  type: 'paywall' | 'login_required' | 'partial_content' | 'other';
  message: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
}

export interface FetchUrlOutput {
  metadata?: PageMetadata; // Page metadata (title, description, author, etc.)
  contentText?: string; // Cleaned text content (without HTML) - available in all modes
  contentHTML?: string; // Full HTML content - only in 'full' mode
  content?: string; // @deprecated - Use contentHTML instead. Kept for backward compatibility
  relatedLinks?: RelatedLink[]; // Contextual links (if extractRelatedLinks is true)
  navigationLinks?: NavigationLink[]; // Navigation menu links (if extractNavigationLinks is true)
  issues?: Issue[]; // Detected issues (paywall, login required, etc.)
}

