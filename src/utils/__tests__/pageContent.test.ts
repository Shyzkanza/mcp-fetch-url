import { describe, it, expect } from 'vitest';
import { extractPageContent } from '../pageContent.js';
import { extractMarkdownContent } from '../markdownExtractor.js';

const URL_PAGE = 'https://lieux.example/films/les-ripoux';

// Les formes mesurées le 2026-11-10 sur 203 pages lues par Firecrawl : la liste des lieux est faite de liens
// (filmfrance, moviemaps, lieuxtournage), l'adresse et les coordonnées sont le texte d'un lien vers une carte.
const PAGE = `<!DOCTYPE html><html><head><title>Les Ripoux</title></head><body>
  <header class="site"><a href="/">Accueil</a> <nav><a href="/films">Films</a></nav></header>
  <div id="cookie-banner"><p>Nous utilisons des cookies.</p><button>OK</button></div>
  <main>
    <article>
      <header><h1>Les Ripoux (1984)</h1><p>Publié le 3 mai</p></header>
      <p>Le film a été tourné à Paris, surtout dans le 18e arrondissement, avec Philippe Noiret.</p>
    </article>
    <section class="locations">
      <h2>Lieux de tournage</h2>
      <ul>
        <li><a href="/localisations/1192/">Gare de l'Est</a></li>
        <li><a href="/localisations/602/">Hippodrome de Vincennes</a></li>
      </ul>
      <h3>A hippodrome</h3>
      <img src="data:image/gif;base64,R0lGOD" data-src="/img/31806-hippodrome.webp" alt="A hippodrome">
      <p><a href="/mapa?lat=48.821478&amp;lng=2.451141">Route de la Ferme 2, Paris, France</a>
         <a href="/mapa?lat=48.821478&amp;lng=2.451141">48.82148, 2.45114</a></p>
    </section>
    <section class="comments"><p>Commentaire de 2008 : la scène du bistrot est tournée rue Mouton-Duvernet.</p></section>
  </main>
  <aside class="sidebar"><p>Films similaires</p></aside>
  <footer><p>© 2026 Lieux</p></footer>
  <script>var tracker = 1;</script>
</body></html>`;

describe('extractPageContent (contentScope: page)', () => {
  const html = extractPageContent(PAGE, URL_PAGE);

  it('keeps the lists of links an article extraction drops', () => {
    expect(html).toContain("Gare de l'Est");
    expect(html).toContain('Hippodrome de Vincennes');
    expect(html).toContain('Route de la Ferme 2, Paris, France');
    expect(html).toContain('rue Mouton-Duvernet');           // comments are content
  });

  it("keeps the article's own header, drops the site's chrome", () => {
    expect(html).toContain('Les Ripoux (1984)');
    for (const bruit of ['Accueil', 'Nous utilisons des cookies', 'Films similaires', '© 2026', 'tracker']) {
      expect(html).not.toContain(bruit);
    }
  });

  it('makes links and lazy images absolute', () => {
    expect(html).toContain('href="https://lieux.example/mapa?lat=48.821478&amp;lng=2.451141"');
    expect(html).toContain('src="https://lieux.example/img/31806-hippodrome.webp"');
  });

  it('never empties a page whose body wears a boilerplate class', () => {
    const t = extractPageContent('<html><body class="side"><main><p>Tourné au Château de Chantilly.</p></main></body></html>', URL_PAGE);
    expect(t).toContain('Château de Chantilly');
  });

  it('keeps the content of an ASP.NET page wrapped in a form', () => {
    const t = extractPageContent('<html><body><form id="aspnetForm"><p>Lieu : Gare de Lyon</p><input type="hidden" value="x"></form></body></html>', URL_PAGE);
    expect(t).toContain('Gare de Lyon');
  });
});

describe('extractMarkdownContent with scope page and images', () => {
  it('renders the list, the map link and the image', () => {
    const md = extractMarkdownContent(PAGE, URL_PAGE, { scope: 'page', includeImages: true });
    expect(md).toContain("[Gare de l'Est](https://lieux.example/localisations/1192/)");
    expect(md).toContain('[Route de la Ferme 2, Paris, France](https://lieux.example/mapa?lat=48.821478&lng=2.451141)');
    expect(md).toContain('![A hippodrome](https://lieux.example/img/31806-hippodrome.webp)');
  });

  it('drops images unless asked, as before', () => {
    const md = extractMarkdownContent(PAGE, URL_PAGE, { scope: 'page' });
    expect(md).not.toContain('![');
  });
});

describe('tables in Markdown', () => {
  it('a data table keeps each row with its cells', () => {
    const html = `<html><body><article><p>Les lieux du film, scène par scène, relevés par la production et vérifiés sur place.</p>
      <table><tr><th>Lieu</th><th>Ville</th><th>Scène</th></tr>
      <tr><td>Gare de l'Est</td><td>Paris</td><td>Arrivée de René</td></tr>
      <tr><td>Hippodrome</td><td>Vincennes</td><td>Les paris | la course</td></tr></table>
      <p>Un second paragraphe pour que la lecture garde bien tout l'article et son tableau des lieux.</p></article></body></html>`;
    const md = extractMarkdownContent(html, URL_PAGE, { scope: 'page' });
    expect(md).toContain('| Lieu | Ville | Scène |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain("| Gare de l'Est | Paris | Arrivée de René |");
    expect(md).toContain('| Hippodrome | Vincennes | Les paris \\| la course |');
  });

  it('a layout table (nested table, lists in cells) keeps its blocks, nothing lost', () => {
    const html = `<html><body><table><tr><td><table><tr><td>Menu</td></tr></table></td>
      <td><h2>Filming locations</h2><ul><li>Palm Beach, FL.</li><li>Panama City Beach, FL.</li></ul></td></tr></table></body></html>`;
    const md = extractMarkdownContent(html, URL_PAGE, { scope: 'page' });
    expect(md).toContain('Palm Beach, FL.');
    expect(md).toContain('Panama City Beach, FL.');
    expect(md).not.toContain('| --- |');
  });
});
