/**
 * Contenu d'une page entière, sans son habillage (contentScope: 'page')
 *
 * Readability garde un seul « article » et jette les blocs à forte densité de liens : sur les pages de lieux de
 * tournage, ce sont justement les listes de lieux (liens vers une fiche, une carte, des coordonnées), les légendes
 * d'images et les blocs voisins de l'article. Ici, la page entière est gardée, moins ce qui n'est jamais du contenu :
 * navigation, en-tête et pied de page du site, barres latérales, bandeaux de cookies, partage, publicités — la même
 * liste que l'option onlyMainContent de Firecrawl, mesurée sur 203 pages de lieux de tournage (2026-11-10).
 */

import * as cheerio from 'cheerio';

/** Jamais du contenu, quel que soit l'endroit. */
const ALWAYS_REMOVED = [
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'object', 'embed',
  'input', 'select', 'textarea', 'button', 'dialog',
  'nav', '[role="navigation"]', '[role="search"]', '[hidden]',
].join(', ');

/** Habillage du site : retiré sauf s'il porte le contenu principal (un <body class="side"> ne vide pas la page). */
const BOILERPLATE = [
  'aside', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
  '.header', '.top', '.navbar', '#header',
  '.footer', '.bottom', '#footer',
  '.sidebar', '.side', '.aside', '#sidebar',
  '.modal', '.popup', '#modal', '.overlay',
  '.ad', '.ads', '.advert', '#ad',
  '.lang-selector', '.language', '#language-selector',
  '.social', '.social-media', '.social-links', '#social',
  '.menu', '.navigation', '#nav',
  '.breadcrumb', '.breadcrumbs', '#breadcrumbs',
  '.share', '#share', '.widget',
  '.cookie', '#cookie', '.skip-link',
].join(', ');

const MAIN = 'main, article, [role="main"], #main, #content, .content, #main-content, .main-content';
const CONSENT = /(^|[\s_-])(cookie|cookies|consent|gdpr|rgpd|didomi|onetrust|tarteaucitron)([\s_-]|$)/i;
const LAZY_SRC = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-url'];

function absolute(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  const h = href.trim();
  if (!h || h.startsWith('#') || /^(javascript|mailto|tel|data):/i.test(h)) return h || undefined;
  try {
    return new URL(h, base).href;
  } catch {
    return h;
  }
}

/**
 * HTML de la page entière, sans habillage, liens et images en adresses absolues.
 */
export function extractPageContent(html: string, url: string): string {
  const $ = cheerio.load(html);
  $(ALWAYS_REMOVED).remove();

  // L'en-tête et le pied de page du SITE (hors article) : celui d'un article porte son titre, sa date.
  $('header, footer').each((_, el) => {
    if ($(el).closest('article, main, [role="main"]').length === 0 && $(el).find(MAIN).length === 0) {
      $(el).remove();
    }
  });
  $(BOILERPLATE).each((_, el) => {
    const $el = $(el);
    if ($el.is('body, html') || $el.find(MAIN).length > 0) return;
    $el.remove();
  });
  // Bandeaux de cookies / consentement : courts, repérés par leur classe ou leur id.
  $('[class], [id]').each((_, el) => {
    const $el = $(el);
    if ($el.is('body, html')) return;
    const marque = `${$el.attr('class') || ''} ${$el.attr('id') || ''}`;
    if (CONSENT.test(marque) && $el.text().trim().length < 2000 && $el.find(MAIN).length === 0) {
      $el.remove();
    }
  });

  // Liens et images en adresses absolues ; une image chargée à la demande prend sa vraie source.
  $('a[href]').each((_, el) => {
    const $el = $(el);
    const h = absolute($el.attr('href'), url);
    if (h) $el.attr('href', h);
  });
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    const lazy = LAZY_SRC.map((a) => $el.attr(a)).find((v) => v && !v.startsWith('data:'));
    const vraie = !src || src.startsWith('data:') ? lazy : src;
    const h = absolute(vraie, url);
    if (h) $el.attr('src', h);
    else $el.remove();
  });

  const body = $('body');
  const out = (body.length ? body.html() : $.root().html()) || '';
  return out.trim();
}
