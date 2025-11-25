/**
 * Extraction des liens de navigation (menu latéral, sidebar, table of contents)
 * Utile pour la documentation et les sites structurés
 */

import * as cheerio from 'cheerio';
import { NavigationLink } from '../types.js';

/**
 * Extrait les liens de navigation du menu latéral/sidebar
 * 
 * @param html - Contenu HTML de la page
 * @param baseUrl - URL de base pour résoudre les URLs relatives
 * @returns Liste des liens de navigation
 */
export function extractNavigationLinks(html: string, baseUrl: string): NavigationLink[] {
  const $ = cheerio.load(html);
  const links: NavigationLink[] = [];

  try {
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;

    // 1. Chercher dans les nav avec classes/id spécifiques (sidebar, menu, toc)
    const navigationSelectors = [
      'nav[class*="sidebar"]',
      'nav[class*="menu"]',
      'nav[class*="toc"]',
      'nav[class*="table-of-contents"]',
      'nav[id*="sidebar"]',
      'nav[id*="menu"]',
      'nav[id*="toc"]',
      'nav[id*="navigation"]',
      'aside[class*="sidebar"]',
      'aside[class*="menu"]',
      'aside[class*="toc"]',
      'aside[class*="navigation"]',
      'aside[id*="sidebar"]',
      'aside[id*="menu"]',
      'aside[id*="toc"]',
      'aside[id*="navigation"]',
      '[class*="sidebar"] nav',
      '[class*="sidebar"] ul',
      '[class*="sidebar"] ol',
      '[id*="sidebar"] nav',
      '[id*="sidebar"] ul',
      '[id*="sidebar"] ol',
      '[class*="toc"]',
      '[id*="toc"]',
      '[class*="table-of-contents"]',
      '[id*="table-of-contents"]',
    ];

    for (const selector of navigationSelectors) {
      const $nav = $(selector).first();
      if ($nav.length > 0) {
        // Vérifier que c'est bien un menu latéral (pas header/footer)
        const $parent = $nav.parent();
        const parentClasses = ($parent.attr('class') || '').toLowerCase();
        const parentId = ($parent.attr('id') || '').toLowerCase();
        
        // Exclure si c'est dans header/footer
        if (parentClasses.includes('header') || parentId.includes('header') ||
            parentClasses.includes('footer') || parentId.includes('footer')) {
          continue;
        }

        const navLinks = extractLinksFromNavigation($, $nav, baseUrlObj, baseDomain);
        if (navLinks.length > 0) {
          links.push(...navLinks);
          break; // Prendre le premier menu trouvé
        }
      }
    }

    // 2. Filtrer et dédupliquer
    const filteredLinks = filterAndDeduplicateNavigationLinks(links, baseUrlObj);

    return filteredLinks.slice(0, 50); // Limiter à 50 liens max
  } catch (error) {
    console.error('Error extracting navigation links:', error);
    return [];
  }
}

/**
 * Extrait les liens d'un élément de navigation
 */
function extractLinksFromNavigation(
  $: cheerio.CheerioAPI,
  $nav: cheerio.Cheerio<any>,
  baseUrl: URL,
  baseDomain: string
): NavigationLink[] {
  const links: NavigationLink[] = [];

  // Chercher tous les liens dans la navigation
  $nav.find('a[href]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href) return;

    try {
      const linkUrl = new URL(href, baseUrl);

      // Garder seulement les liens internes (même domaine)
      if (linkUrl.hostname !== baseDomain && !linkUrl.hostname.endsWith('.' + baseDomain)) {
        return;
      }

      // Ignorer les ancres de la même page (sauf si c'est une table of contents)
      if (linkUrl.pathname === baseUrl.pathname && linkUrl.hash && !$nav.is('[class*="toc"], [id*="toc"]')) {
        return;
      }

      // Ignorer les liens d'édition et pages spéciales
      if (linkUrl.pathname.includes('/w/index.php') ||
          linkUrl.pathname.includes('/edit') ||
          linkUrl.pathname.includes('/Spécial:') ||
          linkUrl.pathname.includes('/Special:') ||
          linkUrl.pathname.includes('/Fichier:') ||
          linkUrl.pathname.includes('/File:') ||
          linkUrl.pathname.includes('/Catégorie:') ||
          linkUrl.pathname.includes('/Category:')) {
        return;
      }

      // Extraire le texte
      const text = extractLinkText($link);
      if (text.length < 3) {
        return; // Ignorer les liens trop courts
      }

      // Déterminer le niveau hiérarchique (si disponible)
      let level: number | undefined;
      const $parent = $link.parents('ul, ol, li').first();
      if ($parent.length > 0) {
        // Compter la profondeur dans les listes imbriquées
        const depth = $link.parents('ul, ol').length;
        level = depth > 0 ? depth : undefined;
      }

      links.push({
        url: linkUrl.href,
        text: text.substring(0, 100),
        level,
      });
    } catch {
      // URL invalide, ignorer
    }
  });

  return links;
}

/**
 * Extrait le texte d'un lien
 */
function extractLinkText($link: cheerio.Cheerio<any>): string {
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

/**
 * Filtre et déduplique les liens de navigation
 */
function filterAndDeduplicateNavigationLinks(
  links: NavigationLink[],
  baseUrl: URL
): NavigationLink[] {
  const seen = new Set<string>();
  const filtered: NavigationLink[] = [];

  for (const link of links) {
    // Normaliser l'URL
    const normalizedUrl = normalizeUrl(link.url);

    // Ignorer les liens vers la même page
    if (normalizedUrl === normalizeUrl(baseUrl.href)) {
      continue;
    }

    // Ignorer les liens déjà vus
    if (seen.has(normalizedUrl)) {
      continue;
    }

    // Ignorer les liens avec texte trop court ou générique
    const textLower = link.text.toLowerCase().trim();
    if (textLower.length < 3 ||
        textLower === 'home' ||
        textLower === 'accueil' ||
        textLower === 'back' ||
        textLower === 'retour') {
      continue;
    }

    seen.add(normalizedUrl);
    filtered.push(link);
  }

  return filtered;
}

/**
 * Normalise une URL pour la comparaison
 */
function normalizeUrl(url: string): string {
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

