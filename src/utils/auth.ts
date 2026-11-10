/**
 * Accès au serveur HTTP par jeton : `Authorization: Bearer <SCRAPIDOU_TOKEN>`.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

const BEARER = /^Bearer[ \t]+(\S+)[ \t]*$/i;

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/**
 * Vrai si l'en-tête `Authorization` porte le jeton attendu. La comparaison se fait en temps constant sur les
 * empreintes SHA-256 : ni le contenu ni la longueur du jeton ne se devinent au temps de réponse.
 */
export function isAuthorized(header: string | undefined, token: string): boolean {
  const match = header ? BEARER.exec(header) : null;
  if (!match) {
    return false;
  }
  return timingSafeEqual(digest(match[1]), digest(token));
}
