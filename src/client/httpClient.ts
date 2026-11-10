/**
 * Client HTTP pour récupérer le contenu des pages web
 */

import { NetworkError } from '../utils/errors.js';
import { decodeHtml } from '../utils/charset.js';

const DEFAULT_TIMEOUT = 30000; // 30 secondes
const MAX_REDIRECTS = 5;

/**
 * Headers HTTP recommandés pour éviter les blocages
 */
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

export interface FetchPageResult {
  html: string;
  finalUrl: string;
  statusCode: number;
}

/**
 * Récupère le contenu HTML d'une page web
 * @param url URL de la page à récupérer
 * @param timeout Timeout en millisecondes (défaut: 30000)
 * @returns Contenu HTML de la page
 * @throws NetworkError en cas d'erreur réseau ou HTTP
 */
export async function fetchPage(
  url: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<FetchPageResult> {
  // Valider l'URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new NetworkError(
        `Invalid URL protocol: ${parsedUrl.protocol}. Only http:// and https:// are supported.`
      );
    }
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(`Invalid URL format: ${url}`);
  }

  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    try {
      // Créer un AbortController pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        redirect: 'manual', // Gérer les redirections manuellement
      });

      clearTimeout(timeoutId);

      // Gérer les redirections
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get('location')
      ) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new NetworkError(
            `Too many redirects (max ${MAX_REDIRECTS})`
          );
        }

        const location = response.headers.get('location')!;
        // Résoudre l'URL relative
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      // Vérifier le status code
      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          { statusCode: response.status, url: currentUrl }
        );
      }

      // Vérifier le Content-Type (tolérant si absent, accepte xhtml+xml)
      const contentType = response.headers.get('content-type') || '';
      const ct = contentType.toLowerCase();
      if (ct && !ct.includes('text/html') && !ct.includes('application/xhtml+xml')) {
        throw new NetworkError(
          `Expected HTML content, got: ${contentType}`,
          { contentType, url: currentUrl }
        );
      }

      // Lire le contenu, décodé selon son jeu de caractères (pas toujours UTF-8)
      const html = decodeHtml(new Uint8Array(await response.arrayBuffer()), contentType);

      return {
        html,
        finalUrl: currentUrl,
        statusCode: response.status,
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError(`Request timeout after ${timeout}ms`, {
            url: currentUrl,
          });
        }
        // « fetch failed » seul ne dit rien : la cause (ENOTFOUND, ECONNRESET, ENETUNREACH, certificat…) est
        // dans error.cause. Sur le serveur, Wikipédia et d'autres sites sortaient ainsi (2026-11-10).
        const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
        const why = cause ? [cause.code, cause.message].filter(Boolean).join(' ') : '';
        throw new NetworkError(`Network error: ${error.message}${why ? ` (${why})` : ''}`, {
          url: currentUrl,
          originalError: error.message,
          ...(why ? { cause: why } : {}),
        });
      }

      throw new NetworkError('Unknown error occurred while fetching page');
    }
  }

  throw new NetworkError(`Too many redirects (max ${MAX_REDIRECTS})`);
}

