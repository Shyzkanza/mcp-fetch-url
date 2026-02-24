# 🗺️ Cartographie Exhaustive - Scrapidou

**Dernière mise à jour** : 2025-01-27  
**Version** : 2.0.1

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture Globale](#architecture-globale)
3. [Workflow de Développement](#workflow-de-développement)
4. [Flux de Données Complet](#flux-de-données-complet)
5. [Détails Techniques par Composant](#détails-techniques-par-composant)
6. [Processus de Build et Déploiement](#processus-de-build-et-déploiement)
7. [Gestion des Erreurs](#gestion-des-erreurs)
8. [Configuration et Environnement](#configuration-et-environnement)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que Scrapidou ?

Scrapidou est un **serveur MCP (Model Context Protocol)** qui permet à ChatGPT, Claude Desktop, Cursor et autres clients MCP de récupérer et extraire du contenu web de manière structurée.

### Flux Principal

```
ChatGPT/Client MCP
    ↓ (requête HTTP POST /mcp)
Serveur MCP (http.ts)
    ↓ (appel tool)
Tool fetch_url (fetchUrl.ts)
    ↓ (fetch HTTP)
Client HTTP (httpClient.ts)
    ↓ (extraction)
Utils (contentExtractor, issueDetector, linkExtractor)
    ↓ (formatage)
Réponse structurée
    ↓ (retour HTTP)
ChatGPT/Client MCP
```

---

## 🏗️ Architecture Globale

### Structure du Projet

```
mcp-fetch-url/
├── src/
│   ├── config.ts              # Configuration centralisée
│   ├── types.ts               # Types TypeScript partagés
│   ├── client/
│   │   └── httpClient.ts      # Client HTTP (fetch, redirections, timeout)
│   ├── tools/
│   │   └── fetchUrl.ts        # Tool MCP: logique métier
│   ├── servers/
│   │   ├── http.ts            # Serveur HTTP Streamable (ChatGPT)
│   │   └── stdio.ts           # Serveur stdio (IDEs)
│   ├── utils/
│   │   ├── contentExtractor.ts    # Extraction contenu (Readability + fallback)
│   │   ├── issueDetector.ts       # Détection paywall/login/contenu partiel
│   │   ├── linkExtractor.ts       # Extraction liens pertinents
│   │   ├── navigationExtractor.ts # Extraction liens navigation
│   │   └── errors.ts              # Gestion erreurs centralisée
│   ├── index.ts               # Entry point stdio
│   ├── http-server.ts         # Entry point HTTP
│   └── http-client.ts         # Client npm (proxy)
├── dist/                      # Code compilé (généré)
├── Dockerfile                 # Image Docker
├── docker-compose.yml         # Stack Docker avec Traefik
└── package.json               # Dépendances et scripts
```

### Couches d'Abstraction

```
┌─────────────────────────────────────────────────┐
│  Couche 1: Clients MCP (ChatGPT, Claude, etc.)  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Couche 2: Serveurs MCP (http.ts, stdio.ts)     │
│  - Gestion protocole MCP                        │
│  - Routing des requêtes                         │
│  - Formatage des réponses                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Couche 3: Tools (fetchUrl.ts)                  │
│  - Validation des entrées                      │
│  - Orchestration de l'extraction                │
│  - Formatage de la réponse                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Couche 4: Clients HTTP (httpClient.ts)         │
│  - Fetch HTTP avec headers                     │
│  - Gestion redirections                        │
│  - Timeout et erreurs réseau                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Couche 5: Utils (extractors, detectors)       │
│  - Extraction contenu (Readability)            │
│  - Détection issues                            │
│  - Extraction liens                            │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Workflow de Développement

### 1. Installation et Setup Initial

#### Étape 1.1 : Cloner le projet
```bash
git clone https://github.com/Shyzkanza/mcp-fetch-url.git
cd mcp-fetch-url
```

#### Étape 1.2 : Vérifier Node.js
```bash
node --version  # Doit être >= 20.0.0
# Si nvm est installé
nvm use  # Utilise .nvmrc (Node 20)
```

#### Étape 1.3 : Installer les dépendances
```bash
npm install
```
**Ce qui se passe** :
- Lecture de `package.json`
- Téléchargement des dépendances :
  - `@modelcontextprotocol/sdk` : SDK MCP officiel
  - `@mozilla/readability` : Extraction de contenu
  - `cheerio` : Parsing HTML côté serveur
  - `jsdom` : DOM virtuel pour Readability
- Installation dans `node_modules/`
- Génération de `package-lock.json`

#### Étape 1.4 : Build initial
```bash
npm run build
```
**Ce qui se passe** :
- TypeScript compile `src/` → `dist/`
- Vérification des types
- Génération des fichiers `.js` et `.d.ts`
- Structure `dist/` créée

### 2. Développement Local

#### Étape 2.1 : Lancer le serveur de développement
```bash
npm run dev
```

**Ce qui se passe** :

1. **Script exécuté** (`package.json`) :
   ```json
   "dev": "npm run kill --silent; nvm use 20 > /dev/null 2>&1 || true; tsx watch src/http-server.ts"
   ```

2. **Séquence d'exécution** :
   - `npm run kill` : Tue tout processus sur le port 3000
   - `nvm use 20` : Active Node.js 20 (si nvm disponible)
   - `tsx watch src/http-server.ts` : Lance TypeScript en mode watch

3. **tsx watch** :
   - Compile `src/http-server.ts` à la volée
   - Surveille les changements dans `src/`
   - Recompile automatiquement à chaque modification
   - Relance le serveur si nécessaire

4. **http-server.ts s'exécute** :
   - Importe `src/servers/http.ts`
   - Crée le serveur MCP HTTP
   - Écoute sur le port 3000 (ou `PORT` env var)
   - Log : `Scrapidou MCP Server (Streamable HTTP) running on http://localhost:3000`

#### Étape 2.2 : Tester avec MCP Inspector
```bash
npm run inspect
```

**Ce qui se passe** :

1. **Script exécuté** :
   ```json
   "inspect": "npx @modelcontextprotocol/inspector@latest http://localhost:3000/mcp"
   ```

2. **MCP Inspector** :
   - Lance un client MCP de test
   - Se connecte à `http://localhost:3000/mcp`
   - Affiche l'interface graphique
   - Permet de tester les tools interactivement

3. **Test du tool `fetch_url`** :
   - Sélectionner `fetch_url` dans la liste
   - Remplir les paramètres (URL, etc.)
   - Cliquer "Call Tool"
   - Voir la réponse structurée

#### Étape 2.3 : Développement avec ChatGPT (ngrok)

**Terminal 1** : Tunnel ngrok
```bash
npm run tunnel
# ou
ngrok http 3000
```

**Ce qui se passe** :
- ngrok crée un tunnel HTTPS public
- URL publique : `https://xxxx-xx-xx-xx-xx.ngrok.io`
- Toutes les requêtes → `localhost:3000`

**Terminal 2** : Serveur de développement
```bash
npm run dev
```

**Configuration ChatGPT** :
1. Settings → Apps & Connectors
2. Developer mode ON
3. Create connector :
   - Name: "Scrapidou Dev"
   - Server URL: `https://xxxx-xx-xx-xx-xx.ngrok.io/mcp`
   - Auth: None
4. Tester avec un prompt : "Fetch content from https://example.com"

### 3. Build de Production

#### Étape 3.1 : Build TypeScript
```bash
npm run build
```

**Ce qui se passe** :

1. **TypeScript Compiler (`tsc`)** :
   - Lit `tsconfig.json`
   - Compile tous les fichiers `.ts` de `src/`
   - Génère les fichiers `.js` dans `dist/`
   - Génère les fichiers `.d.ts` (types) dans `dist/`
   - Vérifie les types (erreurs bloquantes)

2. **Structure générée** :
   ```
   dist/
   ├── client/
   │   └── httpClient.js
   ├── servers/
   │   ├── http.js
   │   └── stdio.js
   ├── tools/
   │   └── fetchUrl.js
   ├── utils/
   │   ├── contentExtractor.js
   │   ├── errors.js
   │   ├── issueDetector.js
   │   ├── linkExtractor.js
   │   └── navigationExtractor.js
   ├── config.js
   ├── http-client.js
   ├── http-server.js
   ├── index.js
   └── types.js
   ```

3. **Vérifications** :
   - Pas d'erreurs TypeScript
   - Tous les imports résolus
   - Types corrects

#### Étape 3.2 : Test du build
```bash
npm run build:start
```

**Ce qui se passe** :
- Build (`npm run build`)
- Start (`node dist/http-server.js`)
- Serveur démarre avec le code compilé
- Test manuel possible

---

## 🔀 Flux de Données Complet

### Scénario : ChatGPT demande de récupérer une page web

#### Phase 1 : Requête depuis ChatGPT

**1.1. Utilisateur tape dans ChatGPT** :
```
"Fetch content from https://example.com/article"
```

**1.2. ChatGPT analyse la requête** :
- Détecte qu'il faut récupérer du contenu web
- Identifie le tool disponible : `fetch_url`
- Prépare l'appel MCP

**1.3. ChatGPT envoie la requête HTTP** :
```http
POST https://scrapidou.rankorr.red/mcp HTTP/1.1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "fetch_url",
    "arguments": {
      "url": "https://example.com/article",
      "contentFormat": "text",
      "maxContentLength": undefined,
      "detectIssues": true,
      "extractRelatedLinks": true,
      "extractNavigationLinks": false
    }
  }
}
```

#### Phase 2 : Réception par le Serveur HTTP

**2.1. Serveur HTTP reçoit la requête** (`src/servers/http.ts`) :

```typescript
// http.ts - Handler POST /mcp
const transport = new StreamableHTTPServerTransport('/mcp', req, res);
const server = createMcpServer();
await server.connect(transport);
```

**Ce qui se passe** :
1. `StreamableHTTPServerTransport` parse la requête HTTP
2. Extrait le JSON-RPC payload
3. Identifie la méthode : `tools/call`
4. Route vers le handler approprié

**2.2. Handler MCP traite la requête** :

```typescript
// http.ts - Handler CallToolRequestSchema
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const toolName = request.params.name; // "fetch_url"
  const toolArgs = request.params.arguments; // { url: "...", ... }
  
  if (toolName === 'fetch_url') {
    const result = await fetchUrl(toolArgs);
    // ...
  }
});
```

**Ce qui se passe** :
1. Vérifie que le tool existe (`fetch_url`)
2. Valide les arguments
3. Appelle la fonction `fetchUrl()` du tool

#### Phase 3 : Exécution du Tool

**3.1. Tool `fetchUrl` démarre** (`src/tools/fetchUrl.ts`) :

```typescript
export async function fetchUrl(input: FetchUrlInput): Promise<FetchUrlOutput> {
  // 1. Validation de l'URL
  const { url } = input;
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new InvalidInputError('URL parameter is required...');
  }
  
  // 2. Validation format URL
  const urlObj = new URL(url.trim());
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new InvalidInputError('Invalid URL protocol...');
  }
  
  // 3. Déterminer le mode interne
  const contentFormat = input.contentFormat || 'text';
  const mode = (contentFormat === 'html' || contentFormat === 'both') ? 'full' : 'standard';
}
```

**Ce qui se passe** :
1. Validation de la présence de l'URL
2. Validation du format (doit être http:// ou https://)
3. Détermination du mode interne selon `contentFormat`

**3.2. Fetch HTTP de la page** :

```typescript
// fetchUrl.ts
const { html, finalUrl } = await fetchPage(trimmedUrl);
```

**Ce qui se passe dans `httpClient.ts`** :

```typescript
export async function fetchPage(url: string, timeout: number = 30000): Promise<FetchPageResult> {
  // 1. Validation URL
  const parsedUrl = new URL(url);
  
  // 2. Boucle de redirections (max 5)
  let currentUrl = url;
  let redirectCount = 0;
  
  while (redirectCount <= MAX_REDIRECTS) {
    // 3. Créer AbortController pour timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // 4. Fetch HTTP avec headers
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: DEFAULT_HEADERS, // User-Agent, Accept, etc.
      signal: controller.signal,
      redirect: 'manual', // Gestion manuelle des redirections
    });
    
    clearTimeout(timeoutId);
    
    // 5. Gérer les redirections (300-399)
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      redirectCount++;
      currentUrl = new URL(response.headers.get('location')!, currentUrl).href;
      continue;
    }
    
    // 6. Vérifier le status code
    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // 7. Vérifier Content-Type (doit être HTML)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new NetworkError(`Expected HTML content, got: ${contentType}`);
    }
    
    // 8. Lire le contenu HTML
    const html = await response.text();
    
    return { html, finalUrl: currentUrl, statusCode: response.status };
  }
}
```

**Résultat** :
- `html` : Contenu HTML brut de la page
- `finalUrl` : URL finale (après redirections)
- `statusCode` : Code HTTP (200, etc.)

**3.3. Extraction des métadonnées** :

```typescript
// fetchUrl.ts
const metadata = extractMetadata(html);
```

**Ce qui se passe** :

```typescript
function extractMetadata(html: string): PageMetadata | undefined {
  const $ = cheerio.load(html);
  const metadata: PageMetadata = {};
  
  // Title (priorité: og:title > twitter:title > <title>)
  const title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() || '';
  if (title) metadata.title = title.trim();
  
  // Description (priorité: og:description > twitter:description > meta description)
  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="twitter:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || '';
  if (description) metadata.description = description.trim();
  
  // Author
  const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content') ||
                  $('[rel="author"]').text() || '';
  if (author) metadata.author = author.trim();
  
  // Published date
  const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                        $('meta[name="published"]').attr('content') ||
                        $('time[datetime]').attr('datetime') || '';
  if (publishedDate) metadata.publishedDate = publishedDate.trim();
  
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
```

**Résultat** :
```typescript
{
  title: "Article Title",
  description: "Article description...",
  author: "Author Name",
  publishedDate: "2025-01-27T10:00:00Z"
}
```

**3.4. Extraction du contenu texte** :

```typescript
// fetchUrl.ts
const contentText = extractTextContent(html, finalUrl);
```

**Ce qui se passe dans `contentExtractor.ts`** :

```typescript
export function extractTextContent(html: string, url: string): string {
  // 1. D'abord extraire le contenu principal HTML
  const mainContentHtml = extractMainContent(html, url);
  
  // 2. Convertir le HTML en texte lisible
  const $ = cheerio.load(mainContentHtml);
  
  // 3. Enlever les éléments non-textuels
  $('script, style, noscript').remove();
  
  // 4. Extraire le texte brut
  let text = $.text();
  
  // 5. Nettoyer le texte
  text = text
    .replace(/\s+/g, ' ') // Espaces multiples → un seul
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Sauts de ligne multiples → 2 max
    .trim();
  
  // 6. Structurer en paragraphes (si possible)
  const paragraphs: string[] = [];
  $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
    const paragraphText = $(el).text().trim();
    if (paragraphText.length > 0) {
      paragraphs.push(paragraphText);
    }
  });
  
  // 7. Si paragraphes structurés trouvés, les utiliser
  if (paragraphs.length > 5) {
    return paragraphs.join('\n\n');
  }
  
  // 8. Sinon, retourner le texte nettoyé
  return text;
}
```

**Extraction du contenu principal** (`extractMainContent`) :

```typescript
export function extractMainContent(html: string, url: string): string {
  try {
    // 1. Essayer d'abord avec Readability (Mozilla)
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    // 2. Vérifier que Readability a extrait du contenu utile
    if (article && article.content && article.content.trim().length > 100) {
      const $test = cheerio.load(article.content);
      const textContent = $test.text().trim();
      
      // 3. Détecter si c'est du header/navigation (pas du contenu réel)
      const hasTooManyDataAttributes = (article.content.match(/data-\w+/g) || []).length > 10;
      const hasTooManyCustomElements = (article.content.match(/<[a-z]+-[a-z-]+/gi) || []).length > 5;
      const textToHtmlRatio = textContent.length / article.content.length;
      
      // 4. Si contenu utile détecté
      if (!hasTooManyDataAttributes && !hasTooManyCustomElements && textToHtmlRatio > 0.1) {
        const cleaned = cleanContent(article.content);
        if (cleaned.trim().length > 100) {
          return cleaned;
        }
      }
    }
  } catch (error) {
    // Readability a échoué, utiliser le fallback
    console.warn('Readability failed, using fallback:', error);
  }
  
  // 5. Fallback manuel : chercher le contenu principal
  return extractMainContentFallback(html);
}
```

**Fallback manuel** :

```typescript
function extractMainContentFallback(html: string): string {
  const $ = cheerio.load(html);
  
  // Enlever les éléments non-contenu
  $('script, style, noscript, nav, header, footer, aside, .ad, .advertisement').remove();
  
  // Chercher le contenu principal (priorité)
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post',
    '.entry',
    '#content',
    '#main',
    'body'
  ];
  
  for (const selector of selectors) {
    const $content = $(selector);
    if ($content.length > 0) {
      const text = $content.text().trim();
      if (text.length > 200) {
        return $content.html() || '';
      }
    }
  }
  
  // Dernier recours : body entier
  return $('body').html() || '';
}
```

**Résultat** :
- `contentText` : Texte propre et lisible, structuré en paragraphes

**3.5. Extraction du contenu HTML (si demandé)** :

```typescript
// fetchUrl.ts
let contentHTML: string | undefined;
if (mode === 'full') {
  contentHTML = extractMainContent(html, finalUrl);
}
```

**Ce qui se passe** :
- Si `contentFormat === 'html'` ou `'both'`
- Appelle `extractMainContent()` (même fonction que pour le texte)
- Retourne le HTML du contenu principal (nettoyé)

**3.6. Détection d'issues (si activée)** :

```typescript
// fetchUrl.ts
const detectIssuesParam = input.detectIssues !== false; // default: true
const issues = detectIssuesParam ? detectIssues(html) : undefined;
```

**Ce qui se passe dans `issueDetector.ts`** :

```typescript
export function detectIssues(html: string): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();
  const text = $.text().toLowerCase();
  
  // 1. Détection paywall
  const paywallKeywords = ['paywall', 'subscribe', 'premium', 'members only'];
  const paywallSelectors = ['.paywall', '.subscription', '[class*="paywall"]'];
  
  if (paywallKeywords.some(kw => text.includes(kw)) ||
      paywallSelectors.some(sel => $(sel).length > 0)) {
    issues.push({
      type: 'paywall',
      message: 'Content may be behind a paywall'
    });
  }
  
  // 2. Détection login required
  const loginKeywords = ['log in', 'sign in', 'login required', 'members only'];
  const loginSelectors = ['form[action*="login"]', '.login', '[class*="login"]'];
  
  if (loginKeywords.some(kw => text.includes(kw)) ||
      loginSelectors.some(sel => $(sel).length > 0)) {
    issues.push({
      type: 'login_required',
      message: 'Content may require login'
    });
  }
  
  // 3. Détection contenu partiel
  const partialKeywords = ['read more', 'continue reading', 'preview', 'subscribe to read'];
  const partialSelectors = ['.preview', '.excerpt', '[class*="preview"]'];
  
  if (partialKeywords.some(kw => text.includes(kw)) ||
      partialSelectors.some(sel => $(sel).length > 0)) {
    issues.push({
      type: 'partial_content',
      message: 'Content may be partially loaded'
    });
  }
  
  return issues;
}
```

**Résultat** :
```typescript
[
  { type: 'paywall', message: 'Content may be behind a paywall' },
  // ...
]
```

**3.7. Extraction des liens pertinents (si activée)** :

```typescript
// fetchUrl.ts
const extractRelated = input.extractRelatedLinks !== false; // default: true
if (extractRelated) {
  const links = extractRelatedLinks(html, finalUrl);
  relatedLinks = links.length > 0 ? links : undefined;
}
```

**Ce qui se passe dans `linkExtractor.ts`** :

```typescript
export function extractRelatedLinks(html: string, baseUrl: string): RelatedLink[] {
  const $ = cheerio.load(html);
  const links: RelatedLink[] = [];
  
  // 1. Chercher les liens dans les sections "related", "see also", etc.
  const relatedSelectors = [
    '.related',
    '.related-articles',
    '.see-also',
    '[class*="related"]',
    'aside a',
    '.sidebar a'
  ];
  
  // 2. Filtrer les liens (pas de pubs, pas de navigation)
  const excludedPatterns = [
    /ad/i, /advertisement/i, /sponsor/i,
    /nav/i, /menu/i, /header/i, /footer/i
  ];
  
  relatedSelectors.forEach(selector => {
    $(selector).find('a').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (!href || !text) return;
      
      // Filtrer les liens exclus
      const linkText = text.toLowerCase();
      if (excludedPatterns.some(pattern => pattern.test(linkText))) return;
      
      // Normaliser l'URL (relative → absolue)
      const absoluteUrl = new URL(href, baseUrl).href;
      
      // Déduplication
      if (links.some(l => l.url === absoluteUrl)) return;
      
      links.push({
        url: absoluteUrl,
        text: text,
        type: 'related'
      });
    });
  });
  
  // 3. Limiter à 20 liens max
  return links.slice(0, 20);
}
```

**Résultat** :
```typescript
[
  { url: "https://example.com/related-article", text: "Related Article", type: "related" },
  // ...
]
```

**3.8. Extraction des liens de navigation (si activée)** :

```typescript
// fetchUrl.ts
const extractNavigation = input.extractNavigationLinks === true; // default: false
if (extractNavigation) {
  const links = extractNavigationLinks(html, finalUrl);
  navigationLinks = links.length > 0 ? links : undefined;
}
```

**Ce qui se passe dans `navigationExtractor.ts`** :

```typescript
export function extractNavigationLinks(html: string, baseUrl: string): NavigationLink[] {
  const $ = cheerio.load(html);
  const links: NavigationLink[] = [];
  
  // 1. Chercher dans nav, sidebar, menu
  const navSelectors = [
    'nav a',
    '.sidebar a',
    '.menu a',
    '[role="navigation"] a',
    '.toc a' // Table of contents
  ];
  
  navSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (!href || !text) return;
      
      // Normaliser l'URL
      const absoluteUrl = new URL(href, baseUrl).href;
      
      // Déterminer le niveau (h1=1, h2=2, etc.)
      let level = 1;
      const $parent = $link.closest('h1, h2, h3, h4, h5, h6, li');
      if ($parent.length > 0) {
        const tagName = $parent.prop('tagName')?.toLowerCase();
        if (tagName?.startsWith('h')) {
          level = parseInt(tagName.substring(1)) || 1;
        }
      }
      
      // Déduplication
      if (links.some(l => l.url === absoluteUrl)) return;
      
      links.push({
        url: absoluteUrl,
        text: text,
        level: level
      });
    });
  });
  
  return links;
}
```

**Résultat** :
```typescript
[
  { url: "https://example.com/section", text: "Section Title", level: 1 },
  // ...
]
```

**3.9. Application de `maxContentLength` (si spécifié)** :

```typescript
// fetchUrl.ts
// Si maxContentLength est défini, tronquer le contenu
if (input.maxContentLength !== undefined) {
  if (contentText.length > input.maxContentLength) {
    output.contentText = contentText.substring(0, input.maxContentLength);
    output.contentTextTruncated = true;
  }
  output.contentTextLength = contentText.length;
  output.contentTextExtractedLength = output.contentText.length;
  
  if (contentHTML && contentHTML.length > input.maxContentLength) {
    output.contentHTML = contentHTML.substring(0, input.maxContentLength);
    output.contentHTMLTruncated = true;
  }
  if (contentHTML) {
    output.contentHTMLLength = contentHTML.length;
    output.contentHTMLExtractedLength = output.contentHTML.length;
  }
}
```

**3.10. Construction de la réponse finale** :

```typescript
// fetchUrl.ts
const output: FetchUrlOutput = {
  metadata,
  contentText,
  // ... autres champs selon les paramètres
};

// Ajouter contentHTML seulement si mode 'full'
if (mode === 'full' && contentHTML) {
  output.contentHTML = contentHTML;
}

// Ajouter les liens si présents
if (relatedLinks) {
  output.relatedLinks = relatedLinks;
}
if (navigationLinks) {
  output.navigationLinks = navigationLinks;
}

// Ajouter les issues si détectées
if (issues && issues.length > 0) {
  output.issues = issues;
}

return output;
```

**Résultat** :
```typescript
{
  metadata: { title: "...", description: "...", ... },
  contentText: "...",
  contentHTML: "...", // si contentFormat: 'html' ou 'both'
  contentTextLength: 1234,
  contentTextExtractedLength: 1234,
  contentTextTruncated: false,
  relatedLinks: [...],
  navigationLinks: [...], // si extractNavigationLinks: true
  issues: [...] // si detectIssues: true
}
```

#### Phase 4 : Formatage de la Réponse MCP

**4.1. Formatage dans le serveur HTTP** :

```typescript
// http.ts - Handler CallToolRequestSchema
if (toolName === 'fetch_url') {
  const result = await fetchUrl(toolArgs);
  
  // Construire la réponse MCP
  return {
    content: [
      {
        type: 'text',
        text: `📄 Content extracted from: ${result.metadata?.title || toolArgs.url}\n\n${result.contentText?.substring(0, 500)}...`
      }
    ],
    structuredContent: result, // JSON structuré directement utilisable
    isError: false
  };
}
```

**Ce qui se passe** :
1. Crée un résumé markdown pour `content` (visible par l'utilisateur)
2. Place les données complètes dans `structuredContent` (accessible par ChatGPT)
3. Formate selon le protocole MCP

**4.2. Envoi de la réponse HTTP** :

```typescript
// StreamableHTTPServerTransport gère l'envoi
// Format JSON-RPC 2.0
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📄 Content extracted from: ..."
      }
    ],
    "structuredContent": {
      "type": "webpage",
      "url": "https://example.com/article",
      "metadata": { ... },
      "contentText": "...",
      "relatedLinks": [ ... ],
      "issues": [ ... ]
    },
    "isError": false
  }
}
```

#### Phase 5 : Réception par ChatGPT

**5.1. ChatGPT reçoit la réponse** :
- Parse le JSON-RPC
- Extrait `content` (affiché à l'utilisateur)
- Extrait `structuredContent` (utilisé pour l'analyse)

**5.2. ChatGPT utilise les données** :
- Analyse le contenu extrait
- Répond à l'utilisateur avec les informations
- Peut utiliser les liens pour explorer davantage

---

## 🔧 Détails Techniques par Composant

### 1. Configuration (`src/config.ts`)

**Rôle** : Centraliser toute la configuration

**Fonctionnement** :

```typescript
export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production';
  corsOrigin: string;
}

export function getServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production',
    corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://chatgpt.com' : '*')
  };
}
```

**Utilisation** :
- Appelé une fois au démarrage
- Singleton (même config partout)
- Validation des valeurs

### 2. Types (`src/types.ts`)

**Rôle** : Définir tous les types TypeScript partagés

**Types principaux** :

```typescript
export interface FetchUrlInput {
  url: string;
  contentFormat?: 'text' | 'html' | 'both';
  maxContentLength?: number;
  detectIssues?: boolean;
  extractRelatedLinks?: boolean;
  extractNavigationLinks?: boolean;
}

export interface FetchUrlOutput {
  metadata?: PageMetadata;
  contentText: string;
  contentHTML?: string;
  contentTextLength?: number;
  contentTextExtractedLength?: number;
  contentTextTruncated?: boolean;
  contentHTMLLength?: number;
  contentHTMLExtractedLength?: number;
  contentHTMLTruncated?: boolean;
  relatedLinks?: RelatedLink[];
  navigationLinks?: NavigationLink[];
  issues?: Issue[];
}

export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
}
```

### 3. Client HTTP (`src/client/httpClient.ts`)

**Rôle** : Abstraire le fetch HTTP avec gestion des redirections, timeout, headers

**Fonctionnalités** :
- Headers par défaut (User-Agent, Accept, etc.)
- Gestion des redirections (max 5)
- Timeout configurable (30s par défaut)
- Validation Content-Type (doit être HTML)
- Gestion d'erreurs réseau

**Flux détaillé** :

```
fetchPage(url)
  ↓
Validation URL
  ↓
Boucle redirections (max 5)
  ├─→ Fetch avec headers
  ├─→ Si 300-399 → suivre redirection
  ├─→ Si 200 → lire HTML
  └─→ Si erreur → throw NetworkError
  ↓
Retour { html, finalUrl, statusCode }
```

### 4. Tool fetch_url (`src/tools/fetchUrl.ts`)

**Rôle** : Orchestrer toute l'extraction

**Flux détaillé** :

```
fetchUrl(input)
  ↓
1. Validation URL
  ├─→ URL présente ?
  ├─→ Format valide ?
  └─→ Protocol http/https ?
  ↓
2. Déterminer mode interne
  ├─→ contentFormat === 'html' ou 'both' → mode 'full'
  └─→ Sinon → mode 'standard'
  ↓
3. Fetch HTTP (httpClient.fetchPage)
  ↓
4. Extraction métadonnées (extractMetadata)
  ↓
5. Extraction texte (extractTextContent)
  ↓
6. Extraction HTML (si mode 'full')
  ↓
7. Détection issues (si detectIssues: true)
  ↓
8. Extraction liens pertinents (si extractRelatedLinks: true)
  ↓
9. Extraction liens navigation (si extractNavigationLinks: true)
  ↓
10. Application maxContentLength (si défini)
  ↓
11. Construction réponse
  ↓
12. Retour FetchUrlOutput
```

### 5. Utils - Content Extractor (`src/utils/contentExtractor.ts`)

**Rôle** : Extraire le contenu principal d'une page

**Stratégie** :
1. **Readability (Mozilla)** : Algorithme intelligent pour identifier le contenu principal
2. **Fallback manuel** : Si Readability échoue, chercher dans `main`, `article`, etc.

**Fonctionnement Readability** :
- Analyse la structure DOM
- Identifie le contenu principal (vs navigation, header, footer)
- Retourne le HTML du contenu principal

**Fonctionnement Fallback** :
- Cherche dans les sélecteurs : `main`, `article`, `.content`, etc.
- Enlève les éléments non-contenu (scripts, styles, nav, etc.)
- Retourne le HTML trouvé

### 6. Utils - Issue Detector (`src/utils/issueDetector.ts`)

**Rôle** : Détecter les problèmes d'accès au contenu

**Détections** :
- **Paywall** : Mots-clés ("paywall", "subscribe") + sélecteurs CSS
- **Login required** : Mots-clés ("log in", "sign in") + formulaires login
- **Partial content** : Mots-clés ("read more", "preview") + sélecteurs preview

**Méthode** :
- Analyse du texte (lowercase)
- Analyse des sélecteurs CSS
- Retourne un tableau d'issues

### 7. Utils - Link Extractor (`src/utils/linkExtractor.ts`)

**Rôle** : Extraire les liens pertinents ("See also", "Related articles")

**Stratégie** :
- Cherche dans `.related`, `.see-also`, `aside`, etc.
- Filtre les pubs et navigation
- Normalise les URLs (relatives → absolues)
- Déduplication
- Limite à 20 liens max

### 8. Utils - Navigation Extractor (`src/utils/navigationExtractor.ts`)

**Rôle** : Extraire les liens de navigation (sidebar, menu)

**Stratégie** :
- Cherche dans `nav`, `.sidebar`, `.menu`, etc.
- Détermine le niveau (h1=1, h2=2, etc.)
- Normalise les URLs
- Déduplication

### 9. Serveur HTTP (`src/servers/http.ts`)

**Rôle** : Implémenter le serveur MCP HTTP avec Streamable HTTP Transport

**Fonctionnalités** :
- Endpoint `/mcp` (GET/POST) pour le protocole MCP
- Endpoint `/health` pour health check
- Gestion CORS
- Streamable HTTP Transport (SDK MCP)

**Handlers MCP** :
- `tools/list` : Liste les tools disponibles
- `tools/call` : Appelle un tool
- `resources/list` : Liste les resources (vide pour Scrapidou)
- `resources/read` : Lit une resource (non utilisé)

**Flux de requête** :

```
Requête HTTP POST /mcp
  ↓
StreamableHTTPServerTransport.parse()
  ↓
Identifie méthode JSON-RPC
  ├─→ tools/list → retourne [fetchUrlTool]
  ├─→ tools/call → appelle fetchUrl() → retourne résultat
  └─→ Autres → erreur
  ↓
Formatage réponse JSON-RPC
  ↓
Envoi HTTP
```

### 10. Serveur stdio (`src/servers/stdio.ts`)

**Rôle** : Implémenter le serveur MCP stdio (pour IDEs)

**Fonctionnalités** :
- Lit depuis `stdin` (JSON-RPC)
- Écrit dans `stdout` (JSON-RPC)
- Même logique que le serveur HTTP

**Utilisation** :
- Cursor, Claude Desktop, Warp
- Configuration : `{ "command": "node", "args": ["dist/index.js"] }`

---

## 🚀 Processus de Build et Déploiement

### 1. Build Local

**Commande** : `npm run build`

**Étapes** :

1. **TypeScript Compiler** :
   ```bash
   tsc
   ```
   - Lit `tsconfig.json`
   - Compile `src/**/*.ts` → `dist/**/*.js`
   - Génère les types `dist/**/*.d.ts`
   - Vérifie les types (erreurs bloquantes)

2. **Résultat** :
   - `dist/` contient tout le code compilé
   - Prêt pour exécution avec `node dist/http-server.js`

### 2. Test Local

**Commande** : `npm run build:start`

**Étapes** :
1. Build (`npm run build`)
2. Start (`node dist/http-server.js`)
3. Serveur démarre sur `localhost:3000`
4. Test manuel possible

### 3. Déploiement Docker

**Étapes** :

**3.1. Build de l'image Docker** :

```dockerfile
# Dockerfile - Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/http-server.js"]
```

**Ce qui se passe** :
1. **Stage 1 (builder)** :
   - Installe toutes les dépendances (dev + prod)
   - Copie le code source
   - Build TypeScript → `dist/`

2. **Stage 2 (runtime)** :
   - Copie seulement `dist/` et `package*.json`
   - Installe seulement les dépendances de production
   - Image finale légère

**3.2. docker-compose.yml** :

```yaml
services:
  mcp-scrapidou:
    build: .
    container_name: mcp-scrapidou
    labels:
      - "traefik.http.routers.mcp-scrapidou.rule=Host(`scrapidou.rankorr.red`)"
      - "traefik.http.routers.mcp-scrapidou.tls=true"
      - "traefik.http.routers.mcp-scrapidou.tls.certresolver=myresolver"
      - "traefik.http.services.mcp-scrapidou.loadbalancer.server.port=3000"
```

**Ce qui se passe** :
- Traefik détecte les labels
- Crée automatiquement le routage
- SSL automatique (Let's Encrypt)
- Proxy vers le port 3000 du container

**3.3. Déploiement via GitHub Actions** :

```yaml
# .github/workflows/deploy.yml
- name: Deploy to Portainer
  run: |
    curl -X POST \
      -H "X-API-Key: ${{ secrets.PORTAINER_API_KEY }}" \
      https://portainer.rankorr.red/api/stacks/${{ secrets.PORTAINER_STACK_ID }}/git/redeploy \
      -d '{"ref": "main"}'
```

**Ce qui se passe** :
1. Push sur `main` déclenche le workflow
2. Build de l'image Docker
3. Push vers le registry (si configuré)
4. Appel API Portainer pour redéployer
5. Portainer pull la nouvelle image et redémarre le container

### 4. Publication npm (si applicable)

**Étapes** :

1. **Incrémenter la version** dans `package.json`
2. **Build** : `npm run build`
3. **Test** : Vérifier que tout fonctionne
4. **Tag Git** : `git tag 2.0.1 && git push --tags`
5. **Publication** : `npm publish` (ou automatique via GitHub Actions)

---

## ⚠️ Gestion des Erreurs

### Hiérarchie des Erreurs

```typescript
// src/utils/errors.ts

ScrapidouError (base)
  ├─→ InvalidInputError (validation)
  ├─→ NetworkError (réseau, HTTP)
  ├─→ APIError (API externe)
  ├─→ NotFoundError (404)
  └─→ RateLimitError (429)
```

### Flux de Gestion des Erreurs

```
Erreur survient
  ↓
Attrapée par try/catch
  ↓
Vérification du type
  ├─→ ScrapidouError → formatage direct
  └─→ Error générique → conversion en ScrapidouError
  ↓
formatErrorForMCP(error)
  ↓
Message formaté pour MCP
  ↓
Retour dans la réponse MCP
  {
    "isError": true,
    "content": [{ "type": "text", "text": "Error message..." }]
  }
```

### Exemples d'Erreurs

**1. URL invalide** :
```typescript
throw new InvalidInputError('URL parameter is required...');
// → HTTP 400, message clair
```

**2. Erreur réseau** :
```typescript
throw new NetworkError('Request timeout after 30000ms');
// → HTTP 500, message avec détails
```

**3. Page non trouvée** :
```typescript
throw new NotFoundError('Page not found: 404');
// → HTTP 404, message clair
```

---

## ⚙️ Configuration et Environnement

### Variables d'Environnement

```bash
# .env (optionnel)
PORT=3000                          # Port du serveur HTTP
NODE_ENV=production                # Environment (development/production)
CORS_ORIGIN=*                      # CORS origin (* en dev, https://chatgpt.com en prod)
```

### Configuration par Environnement

**Development** :
- `NODE_ENV=development`
- `CORS_ORIGIN=*` (tous les origines autorisées)
- Logs détaillés
- Hot-reload avec `tsx watch`

**Production** :
- `NODE_ENV=production`
- `CORS_ORIGIN=https://chatgpt.com` (restrictif)
- Logs minimaux
- Code compilé (`dist/`)

### Fichiers de Configuration

**tsconfig.json** :
- Configuration TypeScript
- Options de compilation
- Paths et aliases

**package.json** :
- Dépendances
- Scripts npm
- Métadonnées du package

**Dockerfile** :
- Image Docker
- Multi-stage build
- Commandes de démarrage

**docker-compose.yml** :
- Stack Docker
- Labels Traefik
- Réseaux et volumes

---

## 📊 Diagrammes de Flux

### Flux Complet (Requête → Réponse)

```
┌─────────────┐
│   ChatGPT   │
│  (Client)   │
└──────┬──────┘
       │ POST /mcp
       │ { method: "tools/call", params: { name: "fetch_url", arguments: {...} } }
       ↓
┌──────────────────────────────────────┐
│  Serveur HTTP (http.ts)              │
│  - StreamableHTTPServerTransport     │
│  - Parse JSON-RPC                     │
│  - Route vers handler                 │
└──────┬────────────────────────────────┘
       │
       │ Handler: CallToolRequestSchema
       ↓
┌──────────────────────────────────────┐
│  Tool fetch_url (fetchUrl.ts)        │
│  - Validation URL                    │
│  - Déterminer mode                   │
└──────┬────────────────────────────────┘
       │
       │ fetchPage(url)
       ↓
┌──────────────────────────────────────┐
│  Client HTTP (httpClient.ts)         │
│  - Fetch avec headers                │
│  - Gestion redirections              │
│  - Timeout                           │
└──────┬────────────────────────────────┘
       │
       │ { html, finalUrl, statusCode }
       ↓
┌──────────────────────────────────────┐
│  Utils Extraction                    │
│  ├─ extractMetadata()                │
│  ├─ extractTextContent()              │
│  ├─ extractMainContent()              │
│  ├─ detectIssues()                   │
│  ├─ extractRelatedLinks()            │
│  └─ extractNavigationLinks()        │
└──────┬────────────────────────────────┘
       │
       │ FetchUrlOutput
       ↓
┌──────────────────────────────────────┐
│  Formatage Réponse MCP                │
│  - content (markdown)                 │
│  - structuredContent (JSON)           │
└──────┬────────────────────────────────┘
       │
       │ JSON-RPC Response
       ↓
┌─────────────┐
│   ChatGPT   │
│  (Client)   │
└─────────────┘
```

### Flux d'Extraction de Contenu

```
HTML brut
  ↓
extractMainContent()
  ├─→ Readability (Mozilla)
  │   ├─→ Succès ? → Retourne HTML contenu principal
  │   └─→ Échec ? → Fallback manuel
  │
  └─→ Fallback manuel
      ├─→ Chercher dans main, article, .content, etc.
      └─→ Retourne HTML trouvé
  ↓
HTML contenu principal
  ↓
extractTextContent()
  ├─→ Charger HTML dans Cheerio
  ├─→ Enlever script, style, noscript
  ├─→ Extraire texte brut
  ├─→ Nettoyer (espaces, sauts de ligne)
  └─→ Structurer en paragraphes (si possible)
  ↓
Texte propre et lisible
```

---

## 🎯 Points Clés à Retenir

### Architecture

1. **Séparation des responsabilités** : Chaque composant a un rôle précis
2. **Réutilisabilité** : Tools indépendants des serveurs
3. **Testabilité** : Chaque couche peut être testée isolément
4. **Extensibilité** : Facile d'ajouter de nouveaux tools

### Flux de Données

1. **Requête MCP** → Serveur HTTP → Tool → Client HTTP → Utils → Réponse
2. **Validation** à chaque étape
3. **Gestion d'erreurs** centralisée
4. **Formatage** selon le protocole MCP

### Extraction

1. **Readability** en premier (algorithme intelligent)
2. **Fallback manuel** si Readability échoue
3. **Nettoyage** du HTML (scripts, styles, etc.)
4. **Structuration** du texte (paragraphes)

### Déploiement

1. **Build** TypeScript → `dist/`
2. **Docker** multi-stage (image légère)
3. **Traefik** pour le routage et SSL
4. **GitHub Actions** pour l'automatisation

---

**Document maintenu par** : AI Assistant (Claude)  
**Pour** : Jessy Bonnotte (@rankorr)  
**Dernière mise à jour** : 2025-01-27


