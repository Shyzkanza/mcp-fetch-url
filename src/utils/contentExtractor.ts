/**
 * Extraction du contenu principal d'une page web
 * Utilise Readability (Mozilla) avec fallback manuel
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

/**
 * Extrait le texte nettoyé et lisible d'une page HTML (sans balises HTML)
 * 
 * @param html - Contenu HTML brut de la page
 * @param url - URL de la page (pour résoudre les URLs relatives)
 * @returns Texte nettoyé et lisible
 */
export function extractTextContent(html: string, url: string): string {
  // D'abord extraire le contenu principal HTML
  const mainContentHtml = extractMainContent(html, url);
  
  // Convertir le HTML en texte lisible
  const $ = cheerio.load(mainContentHtml);
  
  // Enlever les éléments non-textuels
  $('script, style, noscript').remove();
  
  // Extraire le texte
  let text = $.text();
  
  // Nettoyer le texte : enlever les espaces multiples, sauts de ligne excessifs
  text = text
    .replace(/\s+/g, ' ') // Remplacer tous les espaces multiples par un seul
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Limiter les sauts de ligne multiples à 2 max
    .trim();
  
  // Séparer les paragraphes de manière plus lisible
  // Si on a des balises <p>, <h1-h6>, etc., on peut les utiliser pour structurer
  const paragraphs: string[] = [];
  $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
    const $el = $(el);
    const paragraphText = $el.text().trim();
    if (paragraphText.length > 0) {
      paragraphs.push(paragraphText);
    }
  });
  
  // Si on a trouvé des paragraphes structurés, les utiliser
  if (paragraphs.length > 5) {
    return paragraphs.join('\n\n');
  }
  
  // Sinon, retourner le texte nettoyé
  return text;
}

/**
 * Extrait le contenu principal d'une page HTML
 * 
 * @param html - Contenu HTML brut de la page
 * @param url - URL de la page (pour résoudre les URLs relatives)
 * @returns HTML du contenu principal nettoyé
 */
export function extractMainContent(html: string, url: string): string {
  try {
    // Essayer d'abord avec Readability (algorithme Mozilla)
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.content && article.content.trim().length > 100) {
      // Vérifier si Readability a extrait du contenu utile
      // (pas juste des éléments de navigation/header)
      const $test = cheerio.load(article.content);
      const textContent = $test.text().trim();
      
      // Si le contenu extrait contient beaucoup de balises custom/attributs data-,
      // c'est probablement du header/navigation, pas du contenu réel
      const hasTooManyDataAttributes = (article.content.match(/data-\w+/g) || []).length > 10;
      const hasTooManyCustomElements = (article.content.match(/<[a-z]+-[a-z-]+/gi) || []).length > 5;
      
      // Si le texte extrait est trop court par rapport au HTML, c'est suspect
      const textToHtmlRatio = textContent.length / article.content.length;
      
      // Si Readability semble avoir extrait du contenu utile
      if (!hasTooManyDataAttributes && !hasTooManyCustomElements && textToHtmlRatio > 0.1) {
        const cleaned = cleanContent(article.content);
        if (cleaned.trim().length > 100) {
          return cleaned;
        }
      }
      // Sinon, Readability a probablement extrait du header/nav, utiliser le fallback
    }
  } catch (error) {
    // Readability a échoué, utiliser le fallback manuel
    console.warn('Readability failed, using fallback:', error instanceof Error ? error.message : String(error));
  }

  // Fallback manuel : chercher le contenu principal
  const fallbackResult = extractMainContentFallback(html);
  if (fallbackResult.trim().length < 100) {
    console.warn('Fallback extraction returned minimal content, trying alternative approach');
  }
  return fallbackResult;
}

/**
 * Nettoie le contenu HTML en enlevant les éléments indésirables
 * mais en préservant la structure (images, citations, formatage)
 * 
 * @param html - HTML à nettoyer
 * @returns HTML nettoyé
 */
function cleanContent(html: string): string {
  const $ = cheerio.load(html);

  // Enlever les scripts et styles
  $('script, style').remove();

  // Enlever les éléments de publicité (être plus sélectif pour éviter les faux positifs)
  // Chercher seulement les classes/id qui sont clairement des publicités
  $('[class*="ad-"], [class*="-ad-"], [class*="advertisement"], [class*="sponsor-"], [id*="ad-"], [id*="-ad-"], [id*="advertisement"]')
    .each((_, el) => {
      const $el = $(el);
      const className = ($el.attr('class') || '').toLowerCase();
      const id = ($el.attr('id') || '').toLowerCase();
      // Exclure les éléments qui ne sont clairement pas des pubs (comme "readability")
      if (!className.includes('readability') && !id.includes('readability') &&
          !className.includes('advance') && !id.includes('advance')) {
        $el.remove();
      }
    });
  
  // Enlever les popups/modals (être sélectif)
  $('[class*="popup"], [class*="modal"], [class*="overlay"]')
    .each((_, el) => {
      const $el = $(el);
      const className = ($el.attr('class') || '').toLowerCase();
      // Enlever seulement si c'est clairement un popup/modal
      if (className.includes('popup') || className.includes('modal') || className.includes('overlay')) {
        $el.remove();
      }
    });

  // Enlever les éléments de navigation/sidebar (seulement s'ils sont vraiment de la nav)
  $('nav, header, footer').remove();
  
  // Pour les aside, être plus sélectif
  $('aside').each((_, el) => {
    const $el = $(el);
    const ariaLabel = ($el.attr('aria-label') || '').toLowerCase();
    const className = ($el.attr('class') || '').toLowerCase();
    // Garder seulement les aside avec "related" ou "see also"
    if (!ariaLabel.includes('related') && !ariaLabel.includes('see also') && !className.includes('related')) {
      $el.remove();
    }
  });

  // Préserver les éléments importants
  // (images, citations, code, formatage sont déjà préservés par Readability)

  return $.html();
}

/**
 * Fallback manuel si Readability échoue
 * Cherche le plus grand conteneur avec beaucoup de texte
 * 
 * @param html - HTML brut
 * @returns HTML du contenu principal
 */
function extractMainContentFallback(html: string): string {
  const $ = cheerio.load(html);

  // Enlever scripts, styles, nav, header, footer
  $('script, style, nav, header, footer').remove();

  // Chercher le contenu principal
  let mainContent: cheerio.Cheerio<any> | null = null;
  let maxTextLength = 0;

  // Sélecteurs spécifiques pour sites populaires (Wikipedia, GitHub, etc.)
  const specificSelectors = [
    '.repository-content',        // GitHub (releases, tags, etc.)
    '#repository-container',       // GitHub (alternative)
    '#mw-content-text',           // Wikipedia
    '.mw-parser-output',          // Wikipedia
    '#content',                   // Générique
    '#main-content',              // Générique
    '.main-content',              // Générique
    '.entry-content',             // WordPress
    '.post-content',               // Blogs
    '[role="article"]',           // ARIA
  ];

  for (const selector of specificSelectors) {
    const $el = $(selector).first();
    if ($el.length > 0) {
      const textLength = $el.text().trim().length;
      if (textLength > maxTextLength && textLength > 100) {
        maxTextLength = textLength;
        mainContent = $el;
      }
    }
  }

  // Essayer ensuite les balises sémantiques
  if (!mainContent || maxTextLength < 500) {
    const semanticSelectors = ['article', 'main', '[role="main"]', '.article', '.content', '.post', '.entry'];
    
    for (const selector of semanticSelectors) {
      const $el = $(selector).first();
      if ($el.length > 0) {
        const textLength = $el.text().trim().length;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
          mainContent = $el;
        }
      }
    }
  }

  // Si pas trouvé, chercher le div le plus grand avec beaucoup de texte
  if (!mainContent || maxTextLength < 500) {
    $('div').each((_, el) => {
      const $el = $(el);
      const textLength = $el.text().trim().length;
      const hasLinks = $el.find('a').length > 0;
      const hasParagraphs = $el.find('p').length > 0;
      
      // Ignorer les divs trop petits ou sans contenu structuré
      if (textLength > maxTextLength && textLength > 500 && (hasLinks || hasParagraphs)) {
        maxTextLength = textLength;
        mainContent = $el;
      }
    });
  }

  // Si toujours rien, prendre le body
  if (!mainContent || maxTextLength < 100) {
    mainContent = $('body');
  }

  // Nettoyer le contenu trouvé
  if (mainContent) {
    // Enlever les pubs
    mainContent.find('[class*="ad"], [id*="ad"], [class*="sponsor"]').remove();
    
    const htmlContent = mainContent.html() || '';
    if (htmlContent.trim().length > 0) {
      return cleanContent(htmlContent);
    }
  }

  // Dernier recours : retourner le body nettoyé
  return cleanContent($('body').html() || html);
}

