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
 */
function detectPaywall($: cheerio.CheerioAPI): string[] {
  const signals: string[] = [];

  // Mots-clés à chercher
  const paywallKeywords = [
    'subscribe',
    'premium',
    'paywall',
    'members only',
    'unlock',
    'subscription required',
    'premium content',
    'pay to read',
    'become a member',
  ];

  // Classes CSS communes pour paywall
  const paywallClasses = [
    '.paywall',
    '.premium-content',
    '.subscription-required',
    '.members-only',
    '[class*="paywall"]',
    '[class*="premium"]',
    '[id*="paywall"]',
  ];

  const text = $('body').text().toLowerCase();

  // Chercher les mots-clés dans le texte
  for (const keyword of paywallKeywords) {
    if (text.includes(keyword)) {
      signals.push(`keyword: "${keyword}"`);
    }
  }

  // Chercher les classes CSS de paywall
  for (const selector of paywallClasses) {
    if ($(selector).length > 0) {
      signals.push(`element: ${selector}`);
    }
  }

  // Chercher les messages explicites
  const paywallMessages = $('*').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return (
      text.includes('this article is for subscribers') ||
      text.includes('subscribe to continue reading') ||
      text.includes('premium content')
    );
  });

  if (paywallMessages.length > 0) {
    signals.push('explicit paywall message');
  }

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
 */
function detectPartialContent($: cheerio.CheerioAPI): string[] {
  const signals: string[] = [];

  // Mots-clés indiquant un contenu partiel
  const partialKeywords = [
    'continue reading',
    'read more',
    'preview',
    'unlock full article',
    'subscribe to read',
    'read the full story',
    'view full article',
  ];

  const text = $('body').text().toLowerCase();

  for (const keyword of partialKeywords) {
    if (text.includes(keyword)) {
      signals.push(`keyword: "${keyword}"`);
    }
  }

  // Chercher les boutons "Read more" ou "Continue reading"
  const readMoreButtons = $('button, a').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return (
      text.includes('read more') ||
      text.includes('continue reading') ||
      text.includes('unlock')
    );
  });

  if (readMoreButtons.length > 0) {
    signals.push('read more button detected');
  }

  // Chercher les éléments avec classe "preview" ou "excerpt"
  if ($('[class*="preview"], [class*="excerpt"]').length > 0) {
    signals.push('preview/excerpt class detected');
  }

  return signals;
}

