/**
 * Extraction de contenu en Markdown à partir de HTML
 * Utilise Turndown pour convertir le HTML nettoyé en Markdown optimisé LLM
 */

import TurndownService from 'turndown';
import { extractMainContent } from './contentExtractor.js';

/**
 * Extrait le contenu Markdown d'une page HTML
 *
 * @param html - Contenu HTML brut de la page
 * @param url - URL de la page (pour résoudre les URLs relatives)
 * @returns Contenu Markdown nettoyé et structuré
 */
export function extractMarkdownContent(html: string, url: string): string {
  // 1. Extraire le contenu principal HTML (Readability + fallback)
  const mainContentHtml = extractMainContent(html, url);

  // 2. Configurer Turndown
  const turndown = new TurndownService({
    headingStyle: 'atx',        // ## Heading style
    codeBlockStyle: 'fenced',   // ```code``` style
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',       // [text](url)
    hr: '---',
  });

  // Règle custom : préserver les langages des code blocks
  turndown.addRule('fencedCodeBlock', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE';
    },
    replacement: (_content, node) => {
      const codeNode = (node as HTMLElement).querySelector('code');
      if (!codeNode) return _content;

      const code = codeNode.textContent || '';
      // Détecter le langage depuis les classes (class="language-python", "highlight-python", etc.)
      const className = codeNode.getAttribute('class') || '';
      const langMatch = className.match(/(?:language|lang|highlight)-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';

      return `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
    },
  });

  // Règle : supprimer les images (pas utile pour LLM en mode texte)
  turndown.addRule('removeImages', {
    filter: 'img',
    replacement: () => '',
  });

  // 3. Convertir en Markdown
  let markdown = turndown.turndown(mainContentHtml);

  // 4. Post-processing : nettoyage
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines consécutifs
    .replace(/[ \t]+$/gm, '')     // Trailing whitespace par ligne
    .trim();

  return markdown;
}
