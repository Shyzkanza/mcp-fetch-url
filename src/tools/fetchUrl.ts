/**
 * Tool MCP : Récupération et extraction de contenu web
 * 
 * fetch_url récupère et extrait le contenu d'une page web avec différents niveaux de détail
 * via le paramètre mode. Mode light pour des réponses légères, mode standard pour un contenu
 * textuel détaillé, mode full pour le HTML complet. Ne pas l'utiliser pour scraper automatiquement
 * tous les liens d'un site.
 * 
 * Logique métier isolée : validation, fetch, extraction, formatage
 */

import { fetchPage } from '../client/httpClient.js';
import { extractMainContent, extractTextContent } from '../utils/contentExtractor.js';
import { detectIssues } from '../utils/issueDetector.js';
import { extractRelatedLinks } from '../utils/linkExtractor.js';
import { extractNavigationLinks } from '../utils/navigationExtractor.js';
import { FetchUrlInput, FetchUrlOutput, PageMetadata } from '../types.js';
import { InvalidInputError, formatErrorForMCP } from '../utils/errors.js';
import * as cheerio from 'cheerio';

/**
 * Récupère et extrait le contenu d'une page web selon le mode spécifié
 * 
 * @param input - Paramètres de récupération
 * @returns Contenu extrait avec métadonnées et liens selon le mode
 * @throws {InvalidInputError} Si l'URL est invalide
 * @throws {NetworkError} Si une erreur réseau survient
 */
export async function fetchUrl(input: FetchUrlInput): Promise<FetchUrlOutput> {
  try {
    // Validation de l'URL
    const { url, mode = 'standard' } = input;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      throw new InvalidInputError('URL parameter is required and must be a non-empty string');
    }

    // Valider le mode
    if (mode && !['light', 'standard', 'full'].includes(mode)) {
      throw new InvalidInputError(
        `Invalid mode: ${mode}. Must be one of: 'light', 'standard', 'full'`
      );
    }

    const trimmedUrl = url.trim();

    // Valider le format de l'URL
    try {
      const urlObj = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new InvalidInputError(
          `Invalid URL protocol: ${urlObj.protocol}. Only http:// and https:// are supported.`
        );
      }
    } catch (error) {
      if (error instanceof InvalidInputError) {
        throw error;
      }
      throw new InvalidInputError(`Invalid URL format: ${trimmedUrl}`);
    }

    // 1. Récupérer la page
    const { html, finalUrl } = await fetchPage(trimmedUrl);

    // 2. Extraire les métadonnées (toujours disponible)
    const metadata = extractMetadata(html);

    // 3. Extraire le texte nettoyé (toujours disponible dans tous les modes)
    const contentText = extractTextContent(html, finalUrl);

    // 4. Extraire le HTML complet (seulement en mode 'full')
    let contentHTML: string | undefined;
    if (mode === 'full') {
      contentHTML = extractMainContent(html, finalUrl);
    }

    // 5. Détecter les problèmes (toujours disponible sauf en mode 'light')
    const issues = mode === 'light' ? undefined : detectIssues(html);

    // 6. Extraire les liens pertinents selon le mode
    let relatedLinks: FetchUrlOutput['relatedLinks'];
    if (mode === 'light') {
      // En mode light, on peut extraire les relatedLinks seulement si très peu coûteux
      // Pour l'instant, on les exclut pour garder la réponse légère
      relatedLinks = undefined;
    } else {
      const extractRelated = input.extractRelatedLinks !== false;
      if (extractRelated) {
        const links = extractRelatedLinks(html, finalUrl);
        relatedLinks = links.length > 0 ? links : undefined;
      }
    }

    // 7. Extraire les liens de navigation (si demandé)
    let navigationLinks: FetchUrlOutput['navigationLinks'];
    if (mode === 'light' && input.extractNavigationLinks === true) {
      // En mode light, on peut extraire les navigationLinks si explicitement demandé
      const links = extractNavigationLinks(html, finalUrl);
      navigationLinks = links.length > 0 ? links : undefined;
    } else if (mode !== 'light') {
      const extractNavigation = input.extractNavigationLinks === true;
      if (extractNavigation) {
        const links = extractNavigationLinks(html, finalUrl);
        navigationLinks = links.length > 0 ? links : undefined;
      }
    }

    // 8. Construire la réponse selon le mode
    const output: FetchUrlOutput = {
      metadata,
      contentText,
    };

    // Ajouter contentHTML seulement en mode 'full'
    if (mode === 'full' && contentHTML) {
      output.contentHTML = contentHTML;
      // Garder aussi 'content' pour la compatibilité (deprecated)
      output.content = contentHTML;
    }

    // Ajouter les liens selon le mode
    if (relatedLinks) {
      output.relatedLinks = relatedLinks;
    }
    if (navigationLinks) {
      output.navigationLinks = navigationLinks;
    }

    // Ajouter les issues (sauf en mode 'light')
    if (issues && issues.length > 0) {
      output.issues = issues;
    }

    return output;
  } catch (error) {
    // Les erreurs personnalisées sont déjà bien formatées
    if (error instanceof InvalidInputError) {
      throw error;
    }

    // Pour les autres erreurs, on les propage avec un message formaté
    throw new Error(formatErrorForMCP(error));
  }
}

/**
 * Extrait les métadonnées de la page (title, description, author, etc.)
 */
function extractMetadata(html: string): PageMetadata | undefined {
  const $ = cheerio.load(html);
  const metadata: PageMetadata = {};

  // Title
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    '';
  if (title) {
    metadata.title = title.trim();
  }

  // Description
  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';
  if (description) {
    metadata.description = description.trim();
  }

  // Author
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').text() ||
    '';
  if (author) {
    metadata.author = author.trim();
  }

  // Published date
  const publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="published"]').attr('content') ||
    $('time[datetime]').attr('datetime') ||
    '';
  if (publishedDate) {
    metadata.publishedDate = publishedDate.trim();
  }

  if (Object.keys(metadata).length > 0) {
    return metadata;
  }
  return undefined;
}

