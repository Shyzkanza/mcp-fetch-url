/**
 * Client HTTP pour récupérer le contenu des pages web
 */

import { NetworkError } from '../utils/errors.js';

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

      // Vérifier le Content-Type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new NetworkError(
          `Expected HTML content, got: ${contentType}`,
          { contentType, url: currentUrl }
        );
      }

      // Lire le contenu
      const html = await response.text();

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
        throw new NetworkError(`Network error: ${error.message}`, {
          url: currentUrl,
          originalError: error.message,
        });
      }

      throw new NetworkError('Unknown error occurred while fetching page');
    }
  }

  throw new NetworkError(`Too many redirects (max ${MAX_REDIRECTS})`);
}

