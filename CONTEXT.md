# 🧠 CONTEXT - Scrapidou

**Last update**: 2025-11-25
**Status**: 🏗️ Base architecture ready - No tools implemented yet

---

## 📋 Overview

**Project name**: Scrapidou  
**Repository**: mcp-fetch-url  
**Description**: Clean, modular MCP server for web scraping and URL fetching  
**Technologies**: Node.js 18+, TypeScript, MCP SDK

---

## 🎯 Key Decisions

### Architecture & Design

- **Modular Architecture**: Clean separation of concerns (same as GeoCrafter)
  - **`config.ts`**: Centralized configuration with validation
  - **`types.ts`**: Shared TypeScript interfaces
  - **`client/`**: External API abstraction (future: HTTP client, rate limiter)
  - **`tools/`**: Business logic (validation, transformation, formatting) - **TO BE IMPLEMENTED**
  - **`servers/`**: MCP implementation (stdio/HTTP), reuses tools
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
│   ├── client/                # 🔜 Client HTTP abstractions
│   ├── tools/                 # 🔜 MCP tools (fetch_url, scrape, etc.)
│   ├── resources/             # 🔜 Templates (if needed)
│   ├── servers/
│   │   ├── stdio.ts           # ✅ Serveur stdio (IDEs)
│   │   └── http.ts            # ✅ Serveur HTTP (ChatGPT)
│   ├── utils/
│   │   └── errors.ts          # ✅ Gestion erreurs centralisée
│   ├── index.ts               # ✅ Entry point stdio
│   ├── http-server.ts         # ✅ Entry point HTTP
│   └── http-client.ts         # ✅ Client npm
├── dist/                      # ✅ Compiled code
├── Dockerfile                 # ✅ Multi-stage Docker image
├── docker-compose.yml         # ✅ Stack with Traefik labels
├── package.json               # ✅ @shyzus/mcp-scrapidou
└── README.md                  # ✅ Complete docs
```

---

## ✅ Current Status

### Base Infrastructure Complete

- ✅ Project structure created
- ✅ TypeScript configuration
- ✅ Package.json with scripts
- ✅ Docker & docker-compose
- ✅ Basic HTTP & stdio servers (skeleton)
- ✅ Error handling system
- ✅ Configuration management
- ✅ Documentation (README, CONTEXT, GITFLOW, SECRETS, OPENAI)

### To Be Implemented (Future)

- 🔜 HTTP client with rate limiting
- 🔜 Tools implementation:
  - `fetch_url` - Retrieve content from any URL
  - `scrape_metadata` - Extract metadata (title, description, og:tags)
  - `scrape_content` - Extract main content from HTML
  - More tools as needed
- 🔜 HTML parsing utilities
- 🔜 robots.txt respect
- 🔜 Caching layer (optional)

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
- ✅ **Initial base structure created**
  - Created modular architecture (config, types, servers, utils)
  - Created skeleton HTTP & stdio servers
  - Created Docker configuration
  - Created complete documentation (README, CONTEXT, GITFLOW, SECRETS, OPENAI)
  - Ready for tools implementation

---

## 💡 Technical Notes

### Server Flow (Future)
```
ChatGPT/IDE requests web content
  ↓
Call tool (fetch_url, scrape_content, etc.)
  ↓
Server validates inputs
  ↓
Server calls tool (business logic)
  ↓
Tool calls client (HTTP abstraction)
  ↓
Client fetches URL with rate limiting
  ↓
Client returns data
  ↓
Tool formats output
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
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [Traefik Docs](https://doc.traefik.io/traefik/)
- Portainer: https://portainer.rankorr.red/
- **[SECRETS.md](SECRETS.md)**: GitHub secrets configuration for CI/CD with Portainer
- **[GITFLOW.md](GITFLOW.md)**: Git workflow strict rules

---

**Maintained by**: AI Assistant (Claude)  
**For**: Jessy Bonnotte (@rankorr)

