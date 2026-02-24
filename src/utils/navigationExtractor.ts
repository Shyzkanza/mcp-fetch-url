/**
 * Extraction des liens de navigation (menu latéral, sidebar, table of contents)
 * Utile pour la documentation et les sites structurés
 */

import * as cheerio from 'cheerio';
import { NavigationLink } from '../types.js';
import { normalizeUrl, extractLinkText } from './urlUtils.js';

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
      // Generic nav/aside selectors
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
      // ARIA roles
      '[role="navigation"]',
      '[role="complementary"]',
      // Docusaurus
      '.theme-doc-sidebar-menu',
      '.menu__list',
      // VitePress
      '.vp-sidebar',
      '.VPSidebar',
      // Nextra
      '.nextra-sidebar-container',
      // GitBook
      '.gitbook-root nav',
      // Wikipedia
      '#mw-panel nav',
      '#mw-panel',
      // Generic data attributes
      '[data-sidebar]',
      '[data-nav]',
    ];

    // Track already-processed DOM elements to avoid duplicates across selectors
    const processedElements = new Set<any>();

    for (const selector of navigationSelectors) {
      $(selector).each((_, el) => {
        const $nav = $(el);

        // Skip already-processed elements
        if (processedElements.has(el)) return;
        processedElements.add(el);

        // Exclure si c'est dans un header/footer (remonter les ancêtres)
        if ($nav.closest('header, footer').length > 0) {
          return;
        }

        const navLinks = extractLinksFromNavigation($, $nav, baseUrlObj, baseDomain);
        if (navLinks.length > 0) {
          links.push(...navLinks);
        }
      });
    }

    // 2. Filtrer et dédupliquer
    const filteredLinks = filterAndDeduplicateNavigationLinks(links, baseUrlObj);

    return filteredLinks.slice(0, 200); // Limiter à 200 liens max
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


