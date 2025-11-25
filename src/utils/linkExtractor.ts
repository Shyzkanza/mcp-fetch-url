/**
 * Extraction des liens pertinents d'une page web
 * (see also, related articles, redirections utiles)
 */

import * as cheerio from 'cheerio';
import { RelatedLink } from '../types.js';

/**
 * Extrait les liens pertinents d'une page web
 * 
 * @param html - Contenu HTML de la page
 * @param baseUrl - URL de base pour résoudre les URLs relatives
 * @returns Liste des liens pertinents
 */
export function extractRelatedLinks(html: string, baseUrl: string): RelatedLink[] {
  const $ = cheerio.load(html);
  const links: RelatedLink[] = [];

  try {
    const baseUrlObj = new URL(baseUrl);

    // 1. Chercher dans les sections "related", "see also", etc. (par classes/id)
    const relatedSections = findRelatedSections($);
    for (const section of relatedSections) {
      const sectionLinks = extractLinksFromSection($, section, baseUrlObj);
      links.push(...sectionLinks);
    }

    // 2. Chercher les sections par titre (intelligent - détecte "Voir aussi", "See also", etc.)
    const sectionsByTitle = findSectionsByTitle($);
    for (const section of sectionsByTitle) {
      const sectionLinks = extractLinksFromSection($, section, baseUrlObj);
      links.push(...sectionLinks);
    }

    // 3. Chercher les liens dans les aside avec aria-label "related"
    const asideLinks = extractLinksFromAside($, baseUrlObj);
    links.push(...asideLinks);

    // 4. Extraire les liens pertinents du contenu principal (liens internes vers autres articles)
    const contentLinks = extractLinksFromMainContent($, baseUrlObj);
    links.push(...contentLinks);

    // 5. Filtrer et dédupliquer
    const filteredLinks = filterAndDeduplicateLinks(links, baseUrlObj);

    return filteredLinks.slice(0, 20); // Limiter à 20 liens max
  } catch (error) {
    console.error('Error extracting links:', error);
    return [];
  }
}

/**
 * Trouve les sections contenant des liens "related" ou "see also" (par classes/id)
 */
function findRelatedSections($: cheerio.CheerioAPI): cheerio.Cheerio<any>[] {
  const sections: cheerio.Cheerio<any>[] = [];

  // Sélecteurs pour les sections de liens pertinents
  const selectors = [
    '[class*="related"]',
    '[class*="see-also"]',
    '[class*="also-read"]',
    '[class*="similar"]',
    '[id*="related"]',
    '[id*="see-also"]',
    'section[aria-label*="related"]',
    'section[aria-label*="see also"]',
    '.related-posts',
    '.related-articles',
    '.see-also',
  ];

  for (const selector of selectors) {
    const $section = $(selector);
    if ($section.length > 0) {
      sections.push($section);
    }
  }

  return sections;
}

/**
 * Trouve les sections par titre (intelligent - détecte "Voir aussi", "See also", etc.)
 * Cherche les titres h2, h3, etc. qui contiennent des mots-clés pertinents
 */
function findSectionsByTitle($: cheerio.CheerioAPI): cheerio.Cheerio<any>[] {
  const sections: cheerio.Cheerio<any>[] = [];
  
  // Mots-clés pour détecter les sections de liens pertinents (multilingue)
  const keywords = [
    'voir aussi',
    'see also',
    'articles connexes',
    'related articles',
    'liens externes',
    'external links',
    'liens utiles',
    'useful links',
    'pour aller plus loin',
    'further reading',
    'lire aussi',
    'read also',
    'articles liés',
    'related topics',
  ];

  // Chercher dans tous les titres (h1-h6)
  $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    const $heading = $(heading);
    const headingText = $heading.text().toLowerCase().trim();
    
    // Vérifier si le titre contient un mot-clé
    const hasKeyword = keywords.some(keyword => headingText.includes(keyword));
    
    if (hasKeyword) {
      // Trouver la section suivante (le prochain élément sibling ou parent)
      // Pour Wikipedia, les sections sont généralement dans un div après le titre
      let $section = $heading.nextUntil('h1, h2, h3, h4, h5, h6');
      
      // Si pas de contenu après, chercher dans le parent
      if ($section.length === 0) {
        $section = $heading.parent().nextUntil('h1, h2, h3, h4, h5, h6');
      }
      
      // Si toujours rien, prendre le parent direct
      if ($section.length === 0) {
        $section = $heading.parent();
      }
      
      if ($section.length > 0) {
        sections.push($section);
      }
    }
  });

  return sections;
}

/**
 * Extrait les liens pertinents du contenu principal
 * Cherche les liens internes qui pointent vers d'autres articles/pages du même domaine
 */
function extractLinksFromMainContent($: cheerio.CheerioAPI, baseUrl: URL): RelatedLink[] {
  const links: RelatedLink[] = [];
  const baseDomain = baseUrl.hostname;

  // Chercher dans le contenu principal (éviter nav, header, footer)
  let mainContent = $('main, article, [role="main"], #content, #main-content, .main-content, .article-content, #mw-content-text').first();
  
  if (mainContent.length === 0) {
    // Fallback: chercher dans body mais exclure nav/header/footer
    const $body = $('body');
    $body.find('nav, header, footer').remove();
    mainContent = $body;
  }

  // Pour Wikipedia, chercher spécifiquement dans les sections "Voir aussi" et "Articles connexes"
  // Ces sections sont généralement après un titre h2 avec ces mots-clés
  const wikiRelatedSections = mainContent.find('h2, h3').filter((_, heading) => {
    const headingText = $(heading).text().toLowerCase();
    return headingText.includes('voir aussi') || 
           headingText.includes('articles connexes') ||
           headingText.includes('see also') ||
           headingText.includes('related articles');
  });

  // Si on trouve des sections "Voir aussi" sur Wikipedia, extraire leurs liens
  if (wikiRelatedSections.length > 0) {
    wikiRelatedSections.each((_, heading) => {
      const $heading = $(heading);
      const $section = $heading.nextUntil('h1, h2, h3').add($heading.next());
      
      $section.find('a[href]').each((_, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        if (!href) return;

        // Filtrer d'abord par href (plus rapide et plus fiable)
        const hrefLower = href.toLowerCase();
        if (hrefLower.includes('/w/index.php') ||
            hrefLower.includes('/edit') ||
            hrefLower.includes('action=edit') ||
            hrefLower.includes('veaction=edit')) {
          return;
        }

        try {
          const linkUrl = new URL(href, baseUrl);
          
          // Garder seulement les liens internes vers d'autres articles Wikipedia
          if (linkUrl.hostname !== baseDomain && !linkUrl.hostname.endsWith('.' + baseDomain)) {
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
              linkUrl.pathname.includes('/Category:') ||
              linkUrl.pathname.includes('/Portail:') ||
              linkUrl.pathname.includes('/Portal:') ||
              linkUrl.pathname.includes('/Discussion:')) {
            return;
          }

          // Ignorer les liens de navigation
          if (isNavigationLink($link)) return;

          const text = extractLinkText($link);
          const textLower = text.toLowerCase().trim();
          if (text.length < 5 || 
              textLower.startsWith('modifier') ||
              textLower.includes('catégorie:') ||
              textLower.includes('category:') ||
              textLower.includes('spécial:') ||
              textLower.includes('special:')) {
            return;
          }

          links.push({
            url: linkUrl.href,
            text: text.substring(0, 100),
            type: 'see_also',
          });
        } catch {
          // URL invalide, ignorer
        }
      });
    });
  }

  // Extraire aussi les liens internes pertinents du contenu principal (mais moins prioritaire)
  mainContent.find('a[href]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href) return;

    // Filtrer d'abord par href (plus rapide)
    const hrefLower = href.toLowerCase();
    if (hrefLower.includes('/w/index.php') ||
        hrefLower.includes('/edit') ||
        hrefLower.includes('action=edit') ||
        hrefLower.includes('veaction=edit')) {
      return;
    }

    try {
      const linkUrl = new URL(href, baseUrl);
      
      // Garder seulement les liens internes (même domaine)
      if (linkUrl.hostname !== baseDomain && !linkUrl.hostname.endsWith('.' + baseDomain)) {
        return;
      }

      // Ignorer les liens de navigation, réseaux sociaux, etc.
      if (isSocialMediaLink(href)) return;
      if (isNavigationLink($link)) return;

      // Ignorer les liens d'édition et pages spéciales (Wikipedia, etc.)
      if (linkUrl.pathname.includes('/w/index.php') || 
          linkUrl.pathname.includes('/edit') ||
          linkUrl.pathname.includes('/Spécial:') ||
          linkUrl.pathname.includes('/Special:') ||
          linkUrl.pathname.includes('/Fichier:') ||
          linkUrl.pathname.includes('/File:') ||
          linkUrl.pathname.includes('/Catégorie:') ||
          linkUrl.pathname.includes('/Category:') ||
          linkUrl.pathname.includes('/Aide:') ||
          linkUrl.pathname.includes('/Help:') ||
          linkUrl.pathname.includes('/Portail:') ||
          linkUrl.pathname.includes('/Portal:') ||
          linkUrl.pathname.includes('/Discussion:') ||
          (linkUrl.searchParams.has('action') && linkUrl.searchParams.get('action') === 'edit') ||
          (linkUrl.searchParams.has('veaction') && linkUrl.searchParams.get('veaction') === 'edit')) {
        return;
      }

      // Ignorer les liens vers des ancres de la même page
      if (linkUrl.pathname === baseUrl.pathname && linkUrl.hash) {
        return;
      }

      // Extraire le texte
      const text = extractLinkText($link);
      
      // Ignorer les liens avec texte trop court ou générique
      const textLower = text.toLowerCase().trim();
      if (text.length < 5 || 
          textLower === 'lire' || 
          textLower === 'read' ||
          textLower.includes('modifier') ||
          textLower.includes('edit') ||
          textLower.includes('catégorie:') ||
          textLower.includes('category:') ||
          textLower.includes('spécial:') ||
          textLower.includes('special:') ||
          textLower.includes('discussion') ||
          textLower.includes('liste des') ||
          textLower.includes('code source')) {
        return;
      }

      links.push({
        url: linkUrl.href,
        text: text.substring(0, 100),
        type: 'related',
      });
    } catch {
      // URL invalide, ignorer
    }
  });

  // Trier par pertinence (liens avec plus de texte = plus pertinents)
  return links.sort((a, b) => b.text.length - a.text.length).slice(0, 10);
}

/**
 * Extrait les liens d'une section
 */
function extractLinksFromSection(
  $: cheerio.CheerioAPI,
  $section: cheerio.Cheerio<any>,
  baseUrl: URL
): RelatedLink[] {
  const links: RelatedLink[] = [];

  // Chercher tous les liens dans la section
  $section.find('a[href]').each((_i: number, el: any) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href) return;

    // Filtrer d'abord par href (plus rapide et plus fiable)
    const hrefLower = href.toLowerCase();
    if (hrefLower.includes('/w/index.php') ||
        hrefLower.includes('/edit') ||
        hrefLower.includes('action=edit') ||
        hrefLower.includes('veaction=edit')) {
      return;
    }

    // Ignorer les liens externes vers réseaux sociaux
    if (isSocialMediaLink(href)) return;

    // Ignorer les liens de navigation
    if (isNavigationLink($link)) return;

    // Résoudre l'URL
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).href;
    } catch {
      return; // URL invalide
    }

    // Extraire le texte du lien
    const text = extractLinkText($link);

    // Déterminer le type
    const type = determineLinkType($section, $link);

    links.push({
      url: absoluteUrl,
      text: text.substring(0, 100), // Limiter à 100 caractères
      type,
    });
  });

  return links;
}

/**
 * Extrait les liens des aside avec aria-label "related"
 */
function extractLinksFromAside($: cheerio.CheerioAPI, baseUrl: URL): RelatedLink[] {
  const links: RelatedLink[] = [];

  $('aside[aria-label*="related"], aside[aria-label*="see also"]').each(
    (_, aside) => {
      const $aside = $(aside);
      $aside.find('a[href]').each((_, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        if (!href) return;

        if (isSocialMediaLink(href)) return;
        if (isNavigationLink($link)) return;

        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          const text = extractLinkText($link);

          links.push({
            url: absoluteUrl,
            text: text.substring(0, 100),
            type: 'related',
          });
        } catch {
          // URL invalide, ignorer
        }
      });
    }
  );

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
 * Détermine le type de lien
 */
function determineLinkType(
  $section: cheerio.Cheerio<any>,
  $link: cheerio.Cheerio<any>
): RelatedLink['type'] {
  const sectionClass = $section.attr('class')?.toLowerCase() || '';
  const sectionId = $section.attr('id')?.toLowerCase() || '';

  if (sectionClass.includes('see-also') || sectionId.includes('see-also')) {
    return 'see_also';
  }

  if (sectionClass.includes('redirect') || sectionId.includes('redirect')) {
    return 'redirect';
  }

  return 'related';
}

/**
 * Vérifie si un lien est un lien vers les réseaux sociaux
 */
function isSocialMediaLink(href: string): boolean {
  const socialDomains = [
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
    'pinterest.com',
    'tiktok.com',
    'snapchat.com',
  ];

  try {
    const url = new URL(href);
    return socialDomains.some((domain) => url.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Vérifie si un lien est un lien de navigation
 */
function isNavigationLink($link: cheerio.Cheerio<any>): boolean {
  const href = $link.attr('href')?.toLowerCase() || '';
  const text = $link.text().toLowerCase();
  const classAttr = $link.attr('class')?.toLowerCase() || '';

  // Liens de navigation communs
  const navKeywords = [
    'home',
    'about',
    'contact',
    'privacy',
    'terms',
    'cookie',
    'sitemap',
    '#top',
    '#main',
    'javascript:',
  ];

  // Vérifier href
  if (navKeywords.some((keyword) => href.includes(keyword))) {
    return true;
  }

  // Vérifier texte
  if (navKeywords.some((keyword) => text.includes(keyword))) {
    return true;
  }

  // Vérifier classes
  if (classAttr.includes('nav') || classAttr.includes('menu')) {
    return true;
  }

  // Liens avec classes de pub
  if (
    classAttr.includes('ad') ||
    classAttr.includes('sponsor') ||
    classAttr.includes('advertisement')
  ) {
    return true;
  }

  return false;
}

/**
 * Filtre et déduplique les liens
 */
function filterAndDeduplicateLinks(
  links: RelatedLink[],
  baseUrl: URL
): RelatedLink[] {
  const seen = new Set<string>();
  const filtered: RelatedLink[] = [];

  for (const link of links) {
    // Normaliser l'URL (enlever fragment, trailing slash, etc.)
    const normalizedUrl = normalizeUrl(link.url);

    // Ignorer les liens vers la même page
    if (normalizedUrl === normalizeUrl(baseUrl.href)) {
      continue;
    }

    // Ignorer les liens déjà vus
    if (seen.has(normalizedUrl)) {
      continue;
    }

    // Ignorer les liens trop courts (probablement pas des articles)
    if (link.text.length < 10) {
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

