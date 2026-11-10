/**
 * Décodage d'une page HTML selon son jeu de caractères
 *
 * `response.text()` décode toujours en UTF-8 : une page en ISO-8859-1 / windows-1252 (vieux sites, pages perso
 * free.fr) sortait en « Ao�t ». Ordre : BOM, charset de l'en-tête Content-Type, <meta charset> ou
 * <meta http-equiv="Content-Type">, puis UTF-8. Un décodage UTF-8 qui produit des caractères de remplacement
 * (U+FFFD) est refait en windows-1252, ce que fait aussi un navigateur face à une page mal déclarée.
 */

const META_CHARSET = /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/i;
const REPLACEMENT = /�/g;

export function charsetFromContentType(contentType: string | null | undefined): string | undefined {
  const m = /charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(contentType || '');
  return m ? m[1].toLowerCase() : undefined;
}

export function charsetFromMeta(bytes: Uint8Array): string | undefined {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  const m = META_CHARSET.exec(head);
  return m ? m[1].toLowerCase() : undefined;
}

function tryDecode(bytes: Uint8Array, label: string): string | undefined {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return undefined; // label inconnu de TextDecoder
  }
}

function isUtf8(label: string): boolean {
  return /^utf-?8$/i.test(label);
}

export function decodeHtml(bytes: Uint8Array, contentType?: string | null): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const declared = charsetFromContentType(contentType) ?? charsetFromMeta(bytes);
  const label = declared && tryDecode(new Uint8Array(0), declared) !== undefined ? declared : 'utf-8';
  const text = tryDecode(bytes, label) ?? new TextDecoder('utf-8').decode(bytes);
  if (isUtf8(label) && (text.match(REPLACEMENT) || []).length >= 3) {
    const latin = tryDecode(bytes, 'windows-1252');
    if (latin !== undefined) {
      return latin;
    }
  }
  return text;
}
