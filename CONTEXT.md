# 🧠 CONTEXT - Scrapidou

**Last update**: 2025-01-27
**Status**: ✅ Production ready

---

## 📋 Overview

**Project name**: Scrapidou  
**Repository**: mcp-fetch-url  
**Description**: Clean, modular MCP server for web scraping and URL fetching  
**Technologies**: Node.js 20+, TypeScript, MCP SDK, Cheerio, Mozilla Readability, jsdom

---

## 🎯 Key Decisions

### Architecture & Design

- **Modular Architecture**: Clean separation of concerns (same as GeoCrafter)
  - **`config.ts`**: Centralized configuration with validation
  - **`types.ts`**: Shared TypeScript interfaces
  - **`client/httpClient.ts`**: HTTP client abstraction (fetch, headers, redirects, timeout)
  - **`tools/fetchUrl.ts`**: Business logic (validation, extraction orchestration) - **✅ IMPLEMENTED**
  - **`utils/contentExtractor.ts`**: Content extraction using Readability + fallback
  - **`utils/issueDetector.ts`**: Issue detection (paywall, login, partial content)
  - **`utils/linkExtractor.ts`**: Related links extraction and filtering
  - **`servers/`**: MCP implementation (stdio/HTTP Streamable), reuses tools
  - **`utils/errors.ts`**: Custom error classes, formatting
  - **Entry points**: Thin wrappers that delegate to servers

- **Why this architecture?**
  - **Reusable**: Tools are independent of servers
  - **Testable**: Each layer is isolated
  - **Extensible**: Easy to add new tools/servers
  - **Maintainable**: Clear responsibilities

### Naming & Legal

- **Chosen name**: Service `Scrapidou`, Display `Scrapidou` (package: `@shyzus/mcp-scrapidou`, repo: `mcp-fetch-url`)
  - Friendly, memorable, no legal risk
  - Safe for future commercial use
- **Disclaimers**: Added in README
  - Respect robots.txt and rate limiting
  - Educational and practical purpose

### Infrastructure

- **Deployment strategy**: Subdomain-based
  - URL: `scrapidou.rankorr.red`
  - MCP Endpoint: `https://scrapidou.rankorr.red/mcp`
  - Healthcheck: `https://scrapidou.rankorr.red/health`
- **Infrastructure**:
  - VPS Debian (51.75.30.220 / rankorr.red)
  - Docker + Traefik (Auto SSL Let's Encrypt, resolver: myresolver) + Portainer
  - GitHub Actions → Portainer API for automatic deployment
  - Docker network: `playlist-server_web`

---

## 🏗️ Project Structure

```
mcp-fetch-url/
├── src/
│   ├── config.ts              # ✅ Configuration centralisée
│   ├── types.ts               # ✅ Types TypeScript partagés
│   ├── client/
│   │   └── httpClient.ts      # ✅ HTTP client avec headers, redirections
│   ├── tools/
│   │   └── fetchUrl.ts        # ✅ Tool MCP: fetch_url
│   ├── resources/             # 🔜 Templates (if needed)
│   ├── servers/
│   │   ├── stdio.ts           # ✅ Serveur stdio (IDEs)
│   │   └── http.ts            # ✅ Serveur HTTP (ChatGPT)
│   ├── utils/
│   │   ├── errors.ts          # ✅ Gestion erreurs centralisée
│   │   ├── contentExtractor.ts # ✅ Extraction contenu (Readability + fallback)
│   │   ├── issueDetector.ts   # ✅ Détection paywall, login, contenu partiel
│   │   └── linkExtractor.ts   # ✅ Extraction liens pertinents
│   ├── index.ts               # ✅ Entry point stdio
│   ├── http-server.ts         # ✅ Entry point HTTP
│   └── http-client.ts         # ✅ Client npm
├── dist/                      # ✅ Compiled code
├── Dockerfile                 # ✅ Multi-stage Docker image
├── docker-compose.yml         # ✅ Stack with Traefik labels
├── package.json               # ✅ @shyzus/mcp-scrapidou
├── .nvmrc                     # ✅ Node version (20)
└── README.md                  # ✅ Complete docs
```

---

## ✅ Current Status

### Base Infrastructure Complete

- ✅ Project structure created
- ✅ TypeScript configuration
- ✅ Package.json with scripts (Node 20+ requirement)
- ✅ Docker & docker-compose
- ✅ HTTP & stdio servers with tool registration
- ✅ Error handling system
- ✅ Configuration management
- ✅ Documentation (README, CONTEXT, GITFLOW, SECRETS, OPENAI)
- ✅ `.nvmrc` file for Node version management

### Tool `fetch_url` Implemented ✅

- ✅ **HTTP Client** (`src/client/httpClient.ts`):
  - Fetch avec headers appropriés (User-Agent, Accept, etc.)
  - Gestion des redirections (max 5)
  - Timeout configurable (30s par défaut)
  - Gestion d'erreurs réseau complète

- ✅ **Content Extractor** (`src/utils/contentExtractor.ts`):
  - Utilise Mozilla Readability pour extraction principale
  - Fallback manuel si Readability échoue
  - Nettoyage HTML (enlève pubs, scripts, styles)
  - Préserve structure (images, citations, formatage)

- ✅ **Issue Detector** (`src/utils/issueDetector.ts`):
  - Détection paywall (mots-clés, classes CSS)
  - Détection login required (formulaires, messages)
  - Détection contenu partiel (preview, "read more")

- ✅ **Link Extractor** (`src/utils/linkExtractor.ts`):
  - Extraction liens "see also", "related articles"
  - Filtrage des pubs et navigation
  - Normalisation URLs (relatives → absolues)
  - Déduplication et limitation (20 max)

- ✅ **Tool MCP** (`src/tools/fetchUrl.ts`):
  - Validation URL
  - Orchestration extraction complète
  - Extraction métadonnées (title, description, author, publishedDate)
  - Format JSON structuré

- ✅ **Integration**:
  - Tool enregistré dans serveurs stdio et HTTP
  - Description claire pour ChatGPT
  - Format de réponse optimisé

---

## 📝 Changelog

### v1.2.0 - 2025-01-27 - Content Consistency

**Release Notes**
- ✅ **content and structuredContent contain same data** - Both fields now contain identical data for consistency
- ✅ `content`: JSON stringified version of structuredContent (for compatibility and fallback)
- ✅ `structuredContent`: JSON object (unchanged, for direct use)
- ✅ Tested with Wikipedia URL

**Git**
- Commit: `e689c18`
- Tag: `1.2.0`
- Branch: `main` (merged from release/1.2.0 with --squash)

---

### v1.1.0 - 2025-01-27 - API Simplification & Content Control

**Breaking Changes**
- ❌ **Suppression du paramètre `mode`** : Le paramètre `mode` (light/standard/full) a été supprimé. Le comportement est maintenant contrôlé par des paramètres explicites.

**New Features**
- ✅ **Paramètre `maxContentLength`** : Contrôle la taille maximale du contenu extrait (en caractères). Permet de choisir entre cartographie rapide (500-1000 chars) et analyse complète (undefined = pas de limite).
- ✅ **Paramètre `detectIssues`** : Contrôle explicite de la détection d'issues (paywall, login, etc.). Par défaut `true`, peut être désactivé pour une extraction plus rapide.
- ✅ **Indicateurs de troncature** : Ajout de `contentTextTruncated`, `contentHTMLTruncated`, `contentTextLength`, `contentTextExtractedLength` pour indiquer si le contenu a été tronqué et les longueurs.

**Improvements**
- ✅ **Descriptions de paramètres améliorées** : Toutes les descriptions de paramètres ont été enrichies avec des exemples d'usage, des recommandations et des notes importantes.
- ✅ **API plus explicite** : Remplacement du mode "preset" par des paramètres explicites pour plus de flexibilité et de clarté.
- ✅ **Documentation README** : Ajout d'une section détaillée sur les use cases, les paramètres et une matrice de décision.

**Technical Changes**
- ✅ Refactorisation de `fetchUrl.ts` pour supprimer la logique basée sur `mode`
- ✅ Le mode interne est maintenant déterminé automatiquement selon `contentFormat` (full si HTML demandé)
- ✅ Mise à jour de `src/servers/http.ts` et `src/servers/stdio.ts` pour les nouveaux paramètres
- ✅ Mise à jour de `src/types.ts` avec les nouveaux paramètres

**Documentation**
- ✅ Mise à jour complète du README avec les nouveaux paramètres
- ✅ Ajout d'exemples d'utilisation pour chaque combinaison de paramètres
- ✅ Suppression des références au paramètre `mode` obsolète

---

### v1.0.3 - 2025-12-01 - Migration vers Streamable HTTP

**Infrastructure**
- ✅ Migration complète vers Streamable HTTP Transport (remplace JSON-RPC custom)
- ✅ Utilisation du SDK MCP officiel (`Server` + `StreamableHTTPServerTransport`)
- ✅ Endpoint unifié `/mcp` (GET/POST) au lieu de endpoints séparés
- ✅ Support garanti de `structuredContent` pour les widgets ChatGPT
- ✅ Mode stateless (pas de gestion de sessions pour simplicité)

**Technical Changes**
- ✅ Refactorisation complète de `src/servers/http.ts`
- ✅ Utilisation de `Server.setRequestHandler` pour les handlers MCP
- ✅ Migration du tool vers le format SDK (`ListToolsRequest`, `CallToolRequest`)
- ✅ Conservation de la logique métier existante (`fetchUrl.ts` inchangé)

**Fixes**
- ✅ Correction dépréciation `Server` → `McpServer` dans `http-client.ts`
- ✅ Utilisation de `McpServer` pour le proxy HTTP client
- ✅ Accès au `Server` sous-jacent via `server.server.setRequestHandler()`
- ✅ Fix "Connector is not safe" ChatGPT :
  - Renommage tool `fetch.get_url` → `fetch_url` (snake_case simple)
  - Simplification description (courte, sans markdown complexe)
  - Polyfill `File` pour Node.js < 20.5 (undici/cheerio)

**Documentation**
- ✅ Mise à jour README badge version
- ✅ Mise à jour CONTEXT.md (changelog, architecture, status)
- ✅ Ajout section "McpServer vs Server" dans typescript-conventions.mdc (si existe)

**Infrastructure**
- ✅ Version synchronisée: package.json, http.ts, http-client.ts
- ✅ SDK MCP mis à jour: `^1.0.4` → `^1.23.0`

---

## 📝 Changelog (ancien)

### Version 1.0.2 (2025-01-27)

**Documentation & Cleanup:**
- ✅ Remove ChatGPT Apps SDK references (not used in this MCP)
- ✅ Update tool descriptions to better guide LLM mode selection
- ✅ Update README with deployment badges and status
- ✅ Remove OPENAI_APPS_SDK_REFERENCE.md file
- ✅ Align all version numbers to 1.0.2

**Improvements:**
- ✅ Enhanced tool descriptions to guide LLM in choosing appropriate extraction modes (light/standard/full)
- ✅ Better documentation for ChatGPT integration

### Version 1.0.1 (2025-11-25)

**Features:**
- ✅ Navigation links extraction (sidebar/menu links for documentation sites)
- ✅ Three extraction modes: `light`, `standard`, `full`
- ✅ Text content extraction (`contentText`) for LLM consumption
- ✅ Improved content extraction with better fallback logic

### Version 1.0.0 (2025-11-25)

**Initial Release:**
- ✅ Core `fetch_url` tool implementation
- ✅ Content extraction with Readability + fallback
- ✅ Issue detection (paywall, login, partial content)
- ✅ Related links extraction
- ✅ Metadata extraction
- ✅ HTTP and stdio MCP servers
- ✅ Docker deployment setup
- ✅ GitHub Actions CI/CD

---

### To Be Implemented (Future)

- 🔜 Rate limiting par domaine
- 🔜 Respect robots.txt
- 🔜 Caching layer (optionnel)
- 🔜 Additional tools (scrape_metadata standalone, etc.)

---

## 🔧 Technical Configuration

### Build & Start

```bash
# Full build
npm run build

# Start HTTP server
npm run start:http

# Dev mode
npm run dev:http
```

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*  # default: * in dev, https://chatgpt.com in prod
```

### Node.js Version

**Requirement**: Node.js 20+ (due to jsdom and @mozilla/readability dependencies)

Use `.nvmrc` file:
```bash
nvm use  # Automatically uses Node 20
```

Or manually:
```bash
nvm install 20
nvm use 20
```

### Endpoints

- `GET /` or `GET /health`: Healthcheck
- `GET /mcp`: MCP discovery (capabilities, tools)
- `POST /mcp`: MCP JSON-RPC requests (initialize, tools/list, tools/call)

---

## 📊 Architecture Benefits

**Problem**: How to create maintainable, reusable MCP servers?

**Solutions implemented**:

1. **Separation of concerns**
   - Client abstraction (HTTP fetching, rate limiting)
   - Business logic in tools (validation, transformation)
   - MCP protocol in servers (stdio/HTTP)
   - Configuration centralized

2. **Reusability**
   - Tools can be used by any server (stdio, HTTP, future transports)
   - Client can be used by multiple tools
   - Error handling centralized

3. **Testability**
   - Each layer can be tested independently
   - Mock-friendly interfaces
   - Clear input/output contracts

4. **Extensibility**
   - Add new tools: create file in `tools/`, register in servers
   - Add new server: create file in `servers/`, add entry point
   - Add new client: create file in `client/`, use in tools

---

## 🏷️ Version Management & Git Tags

### Tagging Convention

**Format des tags** : `{MAJOR}.{MINOR}.{PATCH}` (sans le préfixe "v")

**Exemples** :
- `1.0.0` - Release initiale
- `1.0.1` - Correctif
- `1.1.0` - Nouvelle fonctionnalité
- `2.0.0` - Breaking change

### Processus de Release

**⚠️ IMPORTANT : Avant chaque publication npm, créer un tag Git !**

1. **Incrémenter la version** dans `package.json`
2. **Créer le tag Git** correspondant
3. **Commit et push** (y compris les tags)
4. **Le workflow GitHub Actions** publiera automatiquement sur npm si la version n'existe pas déjà.

**Note** : Les tags doivent être créés sur la branche `main` après le merge de `release/X.Y.Z`.

### Branches et Workflow Gitflow

**Branches principales** :
- **`main`** : Production (protégée, déploiement automatique)
- **`release/X.Y.Z`** : Branche de préparation de release (ne déclenche PAS de déploiement)

**⚠️ RÈGLES IMPORTANTES** :

#### 1. Configuration Git
```bash
git config user.name "Jessy Bonnotte"
git config user.email "jessy.bonnotte@gmail.com"
```
**TOUJOURS vérifier avant de commit** : les commits doivent utiliser `jessy.bonnotte@gmail.com`

#### 2. Workflow de Release (OBLIGATOIRE)

Voir [GITFLOW.md](GITFLOW.md) pour le workflow complet.

#### 3. Pourquoi le Squash Merge ?

- ✅ Historique propre sur `main` (un commit par release)
- ✅ Changelog clair et lisible
- ✅ Facilite les reverts si nécessaire
- ✅ Respect de la convention gitflow

#### 4. Format des Tags

- ❌ `v1.0.0` (avec "v")
- ✅ `1.0.0` (sans "v")

Les tags doivent correspondre EXACTEMENT à la version dans `package.json`

---

## 📝 Change History

### 2025-11-25
- ✅ **Tool `fetch_url` implemented**
  - Implemented HTTP client with headers, redirects, timeout
  - Implemented content extraction using Mozilla Readability + fallback
  - Implemented issue detection (paywall, login required, partial content)
  - Implemented related links extraction with filtering
  - Implemented metadata extraction (title, description, author, publishedDate)
  - Registered tool in stdio and HTTP servers
  - Updated to Node.js 20+ requirement (added .nvmrc)
  - Ready for testing

### 2025-11-25 (earlier)
- ✅ **Initial base structure created**
  - Created modular architecture (config, types, servers, utils)
  - Created skeleton HTTP & stdio servers
  - Created Docker configuration
  - Created complete documentation (README, CONTEXT, GITFLOW, SECRETS, OPENAI)

---

## 💡 Technical Notes

### Server Flow (Current Implementation)
```
ChatGPT/IDE requests web content
  ↓
Call tool fetch_url with URL
  ↓
Server validates URL format
  ↓
Tool calls httpClient.fetchPage()
  ↓
HTTP client fetches page (headers, redirects, timeout)
  ↓
Tool extracts main content (Readability + fallback)
  ↓
Tool detects issues (paywall, login, partial)
  ↓
Tool extracts related links (filtered, deduplicated)
  ↓
Tool extracts metadata (title, description, author)
  ↓
Tool formats JSON response
  ↓
Server returns to ChatGPT/IDE
```

### Error Handling Flow
```
Error occurs (network, validation, HTTP error)
  ↓
Caught by appropriate layer
  ↓
Converted to custom error class
  ↓
Formatted for MCP response
  ↓
Returned to client
```

### Configuration Flow
```
Environment variables
  ↓
config.ts validation
  ↓
getServerConfig() singleton
  ↓
Used by servers, client, tools
```

---

## 📚 Useful Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [ChatGPT Connectors](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt)
- [Traefik Docs](https://doc.traefik.io/traefik/)
- Portainer: https://portainer.rankorr.red/
- **[SECRETS.md](SECRETS.md)**: GitHub secrets configuration for CI/CD with Portainer
- **[GITFLOW.md](GITFLOW.md)**: Git workflow strict rules

---

**Maintained by**: AI Assistant (Claude)  
**For**: Jessy Bonnotte (@rankorr)

