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
  contentFormat?: 'text' | 'html' | 'both'; // Default: 'text' - Format du contenu retourné: 'text' (texte nettoyé), 'html' (HTML complet), 'both' (les deux)
  maxContentLength?: number; // Default: undefined (no limit) - Maximum number of characters to extract from content. Use for quick mapping/summaries. Leave undefined for complete analysis.
  detectIssues?: boolean; // Default: true - Detect issues like paywall, login required, partial content. Set to false for faster extraction.
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

