/**
 * Extraction de contenu en Markdown à partir de HTML
 * Utilise Turndown pour convertir le HTML nettoyé en Markdown optimisé LLM
 */

import TurndownService from 'turndown';
import { extractScopedContent } from './contentExtractor.js';
import type { ContentScope } from '../types.js';

export interface MarkdownOptions {
  /** 'article' (défaut) : l'article seul ; 'page' : la page entière sans habillage. */
  scope?: ContentScope;
  /** Garder les images en ![alt](url absolue). Défaut : false. */
  includeImages?: boolean;
}

const BLOCS_DE_MISE_EN_PAGE = 'table, ul, ol, h1, h2, h3, h4, h5, h6, blockquote, pre';

/**
 * Un tableau de données (lignes et cellules simples) se rend en tableau Markdown ; un tableau de mise en page
 * (tableau imbriqué, listes ou titres dans les cellules) garde le rendu bloc par bloc.
 */
function isDataTable(table: HTMLElement): boolean {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return false;
  return !Array.from(table.querySelectorAll('td, th')).some((c) => c.querySelector(BLOCS_DE_MISE_EN_PAGE));
}

function cell(text: string): string {
  return text.replace(/\s*\n+\s*/g, '<br>').replace(/\|/g, '\\|').trim();
}

/**
 * Extrait le contenu Markdown d'une page HTML
 *
 * @param html - Contenu HTML brut de la page
 * @param url - URL de la page (pour résoudre les URLs relatives)
 * @param options - portée du contenu et images
 * @returns Contenu Markdown nettoyé et structuré
 */
export function extractMarkdownContent(html: string, url: string, options: MarkdownOptions = {}): string {
  // 1. Extraire le contenu HTML (Readability + fallback, ou la page entière sans habillage)
  const mainContentHtml = extractScopedContent(html, url, options.scope ?? 'article');

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

  // Tableaux de données → tableau Markdown, chaque ligne gardée avec ses cellules (lieu ↔ ville ↔ scène).
  const cellTurndown = new TurndownService({ linkStyle: 'inlined', emDelimiter: '*', strongDelimiter: '**' });
  cellTurndown.addRule('noImages', { filter: 'img', replacement: () => '' });
  turndown.addRule('dataTable', {
    filter: (node) => node.nodeName === 'TABLE' && isDataTable(node as HTMLElement),
    replacement: (_content, node) => {
      const rows = Array.from((node as HTMLElement).querySelectorAll('tr'))
        .map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => cell(cellTurndown.turndown((c as HTMLElement).innerHTML))))
        .filter((r) => r.some((c) => c.length > 0));
      if (rows.length === 0) return '';
      const width = Math.max(...rows.map((r) => r.length));
      const line = (r: string[]) => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
      return `\n\n${line(rows[0])}\n| ${Array(width).fill('---').join(' | ')} |\n${rows.slice(1).map(line).join('\n')}\n\n`;
    },
  });

  // Images : supprimées (texte pour LLM), ou gardées en ![alt](url) quand on les demande.
  turndown.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      if (!options.includeImages) return '';
      const el = node as HTMLElement;
      const src = el.getAttribute('src') || '';
      if (!/^https?:\/\//i.test(src)) return '';
      const alt = (el.getAttribute('alt') || '').replace(/[\[\]\n]+/g, ' ').trim();
      return `![${alt}](${src})`;
    },
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
