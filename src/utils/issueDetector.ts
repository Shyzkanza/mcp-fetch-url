/**
 * Détection de problèmes sur une page web
 * (paywall, login required, contenu partiel, etc.)
 */

import * as cheerio from 'cheerio';
import { Issue } from '../types.js';

/**
 * Détecte les problèmes sur une page web
 * 
 * @param html - Contenu HTML de la page
 * @returns Liste des problèmes détectés
 */
export function detectIssues(html: string): Issue[] {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];

  // Détection paywall
  const paywallSignals = detectPaywall($);
  if (paywallSignals.length > 0) {
    issues.push({
      type: 'paywall',
      message: `Paywall detected: ${paywallSignals.join(', ')}`,
    });
  }

  // Détection login required
  const loginSignals = detectLoginRequired($);
  if (loginSignals.length > 0) {
    issues.push({
      type: 'login_required',
      message: `Login required: ${loginSignals.join(', ')}`,
    });
  }

  // Détection contenu partiel
  const partialSignals = detectPartialContent($);
  if (partialSignals.length > 0) {
    issues.push({
      type: 'partial_content',
      message: `Partial content detected: ${partialSignals.join(', ')}`,
    });
  }

  return issues;
}

/**
 * Détecte les signaux de paywall
 *
 * Approche : CSS selectors (haute confiance) + phrases complètes dans les éléments interactifs.
 * Évite de scanner body.text() pour des mots isolés (trop de faux positifs).
 */
function detectPaywall($: cheerio.CheerioAPI): string[] {
  const signals: string[] = [];

  // 1. Classes CSS de paywall (haute confiance)
  const paywallSelectors = [
    '.paywall',
    '.subscription-required',
    '.members-only',
    '[class*="paywall"]',
    '[id*="paywall"]',
    '[data-paywall]',
  ];

  for (const selector of paywallSelectors) {
    if ($(selector).length > 0) {
      signals.push(`element: ${selector}`);
    }
  }

  // 2. Phrases complètes dans les éléments interactifs (boutons, overlays, modals)
  const interactiveSelectors = 'button, [class*="modal"], [class*="overlay"], [class*="banner"], [class*="gate"], [role="dialog"]';
  $(interactiveSelectors).each((_, el) => {
    const elText = $(el).text().toLowerCase();
    if (elText.includes('subscribe to continue reading') ||
        elText.includes('this article is for subscribers') ||
        elText.includes('subscription required') ||
        elText.includes('premium content') ||
        elText.includes('pay to read') ||
        elText.includes('become a member to read') ||
        elText.includes('unlock this article')) {
      signals.push('paywall message in interactive element');
    }
  });

  return signals;
}

/**
 * Détecte les signaux de login required
 */
function detectLoginRequired($: cheerio.CheerioAPI): string[] {
  const signals: string[] = [];

  // Chercher les formulaires de login
  const loginForms = $('form').filter((_, form) => {
    const action = $(form).attr('action')?.toLowerCase() || '';
    const id = $(form).attr('id')?.toLowerCase() || '';
    const className = $(form).attr('class')?.toLowerCase() || '';

    return (
      action.includes('login') ||
      action.includes('signin') ||
      action.includes('auth') ||
      id.includes('login') ||
      className.includes('login')
    );
  });

  if (loginForms.length > 0) {
    signals.push('login form detected');
  }

  // Chercher les messages de login
  const loginKeywords = [
    'please log in',
    'sign in to continue',
    'login required',
    'please sign in',
    'you must be logged in',
  ];

  const text = $('body').text().toLowerCase();
  for (const keyword of loginKeywords) {
    if (text.includes(keyword)) {
      signals.push(`message: "${keyword}"`);
      break; // Un seul message suffit
    }
  }

  // Chercher les liens de login
  const loginLinks = $('a').filter((_, link) => {
    const href = $(link).attr('href')?.toLowerCase() || '';
    const text = $(link).text().toLowerCase();
    return (
      href.includes('login') ||
      href.includes('signin') ||
      text.includes('log in') ||
      text.includes('sign in')
    );
  });

  if (loginLinks.length > 3) {
    // Plusieurs liens de login = probablement une page de login
    signals.push('multiple login links');
  }

  return signals;
}

/**
 * Détecte les signaux de contenu partiel
 *
 * Approche structurelle : cherche les boutons/gates qui bloquent le contenu,
 * pas des mots isolés dans le body (trop de faux positifs).
 */
function detectPartialContent($: cheerio.CheerioAPI): string[] {
  const signals: string[] = [];

  // 1. Boutons "Read more" / "Continue reading" qui bloquent le contenu (pas les liens normaux)
  const gateButtons = $('button, [class*="gate"], [class*="truncat"], [class*="expand"]').filter((_, el) => {
    const elText = $(el).text().toLowerCase().trim();
    return (
      elText.includes('continue reading') ||
      elText.includes('unlock full article') ||
      elText.includes('subscribe to read') ||
      elText.includes('read the full story') ||
      elText.includes('view full article')
    );
  });

  if (gateButtons.length > 0) {
    signals.push('content gate detected');
  }

  // 2. Éléments structurels de troncature (overlays, gradients sur le contenu)
  if ($('[class*="truncated-content"], [class*="article-truncat"], [class*="content-gate"]').length > 0) {
    signals.push('truncated content structure detected');
  }

  return signals;
}

