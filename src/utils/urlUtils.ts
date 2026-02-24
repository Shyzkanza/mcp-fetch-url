/**
 * Utilitaires partagés pour la manipulation d'URLs et l'extraction de texte de liens
 */

import * as cheerio from 'cheerio';

/**
 * Normalise une URL pour la comparaison (enlève fragment, trailing slash, lowercase)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Enlever le fragment
    urlObj.hash = '';
    // Enlever le trailing slash (sauf pour la racine)
    if (urlObj.pathname !== '/') {
      urlObj.pathname = urlObj.pathname.replace(/\/$/, '');
    }
    return urlObj.href.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Extrait le texte d'un lien (aria-label > title > text > img alt)
 */
export function extractLinkText($link: cheerio.Cheerio<any>): string {
  // Essayer d'abord aria-label
  const ariaLabel = $link.attr('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // Puis title
  const title = $link.attr('title');
  if (title) return title.trim();

  // Puis le texte du lien
  let text = $link.text().trim();

  // Si le texte est vide, essayer de prendre le texte des enfants
  if (!text) {
    text = $link.find('img').attr('alt') || '';
  }

  return text || 'Link';
}
