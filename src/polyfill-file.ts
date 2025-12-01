/**
 * Polyfill pour File (requis par undici/cheerio)
 * 
 * Doit être chargé AVANT tout autre import qui utilise undici
 */

if (typeof globalThis.File === 'undefined') {
  // @ts-ignore
  globalThis.File = class File {
    constructor(
      public readonly name: string,
      public readonly lastModified: number = Date.now()
    ) {}
  };
}

