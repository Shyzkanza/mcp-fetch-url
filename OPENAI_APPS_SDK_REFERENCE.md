# OpenAI Apps SDK - Guide de Référence Complet

> Documentation complète du SDK OpenAI Apps pour ChatGPT (Preview 2025)
> Source: https://developers.openai.com/apps-sdk
> Dernière mise à jour: 2025-01-27

> **📚 Bonnes Pratiques Widgets** : Voir la section [Bonnes Pratiques : Développement de Widgets](#bonnes-pratiques--développement-de-widgets) pour les leçons apprises lors du développement de widgets (extraction de données, polling, debugging, patterns recommandés).

## Vue d'ensemble

Le **Apps SDK** est un framework pour construire des applications intégrées dans ChatGPT. Il combine:
- Un **serveur MCP** (Model Context Protocol) qui expose des outils/capacités
- Des **composants UI** (widgets HTML) rendus dans ChatGPT
- Le **modèle AI** qui décide quand invoquer les outils

**Statut**: Preview - les soumissions d'apps ouvriront plus tard en 2025.

---

## Architecture de base

```
┌─────────────────┐
│  MCP Server     │ ← Définit les outils, retourne les données
│  (Node.js)      │
└────────┬────────┘
         │
         ├─── Tools (fonctions callable par ChatGPT)
         ├─── Resources (templates HTML)
         └─── Responses (structuredContent + content + _meta)
              │
              ▼
┌─────────────────────────────────────┐
│  Widget UI (iframe sandbox)         │
│  - Accès à window.openai            │
│  - Reçoit toolOutput                │
│  - Peut appeler callTool()          │
└─────────────────────────────────────┘
```

**Flux d'exécution**:
1. L'utilisateur envoie un prompt dans ChatGPT
2. ChatGPT appelle un outil MCP de votre serveur
3. Le serveur exécute la logique métier et retourne `structuredContent`, `content`, et `_meta`
4. ChatGPT charge le template HTML (`text/html+skybridge`) et injecte les données via `window.openai`
5. Le widget rend l'UI et peut appeler d'autres outils via `window.openai.callTool()`

---

## Installation & Setup Initial

### Dépendances requises

```bash
npm install @modelcontextprotocol/sdk zod
```

**Package.json obligatoire**:
```json
{
  "type": "module"
}
```

### SDKs disponibles

- **TypeScript SDK** – `@modelcontextprotocol/sdk` (recommandé pour Node/React)
- **Python SDK** – `modelcontextprotocol/python-sdk` (avec FastMCP ou FastAPI)

---

## Serveur MCP - Configuration

### 1. Registrer un template (composant UI)

Chaque bundle UI est exposé comme une ressource MCP avec le MIME type `text/html+skybridge`, signalant à ChatGPT de traiter le HTML comme un widget avec injection du runtime.

```javascript
server.registerResource({
  uri: 'template://my-widget',
  name: 'My Widget Template',
  mimeType: 'text/html+skybridge', // CRUCIAL - active le runtime widget
  text: async () => fs.readFileSync('./public/widget.html', 'utf-8'),
  _meta: {
    'openai/widgetCSP': {
      'connect-src': ['https://api.example.com'],
      'img-src': ['https://cdn.example.com']
    },
    'openai/widgetDomain': 'widget.example.com', // Optionnel: domaine dédié
    'openai/widgetDescription': 'Description du widget pour le modèle'
  }
});
```

**Important**: 
- Le MIME type `text/html+skybridge` est obligatoire
- Changez l'URI du template lors de changements breaking pour éviter le cache
- Déclarez les domaines CSP dans `_meta['openai/widgetCSP']`

### 2. Registrer un outil

Les outils sont le contrat que le modèle utilise pour raisonner. Définissez un outil par intention utilisateur.

```javascript
server.registerTool({
  name: 'my_tool',
  title: 'Mon Outil Lisible', // Visible par l'utilisateur
  description: 'Use this when the user wants to... Do NOT use for...',
  inputSchema: {
    type: 'object',
    properties: {
      query: { 
        type: 'string',
        description: 'Description claire du paramètre'
      }
    },
    required: ['query']
  },
  annotations: {
    readOnlyHint: true,      // Signal outil read-only (skip confirmation)
    destructiveHint: false,  // Si true, peut supprimer/écraser données
    openWorldHint: false     // Si true, publie du contenu hors compte user
  },
  securitySchemes: [
    { type: 'noauth' },           // Optionnel: peut être appelé anonymement
    { type: 'oauth2', scopes: ['read'] } // Optionnel: nécessite OAuth
  ],
  _meta: {
    'openai/outputTemplate': 'template://my-widget', // Lie l'outil au widget
    'openai/widgetAccessible': true,  // Permet au widget d'appeler l'outil
    'openai/visibility': 'public'     // 'public' ou 'private' (caché du modèle)
  }
}, async (params) => {
  // Logique métier
  return {
    content: [{
      type: 'text',
      text: 'Narration markdown pour le modèle et l\'utilisateur'
    }],
    structuredContent: {
      // JSON CONCIS visible par widget ET modèle
      // Impacte les performances si trop gros
      items: [...],
      summary: "..."
    },
    _meta: {
      // Données RICHES/SENSIBLES uniquement pour le widget
      // JAMAIS vu par le modèle
      'openai/outputTemplate': 'template://my-widget',
      'openai/closeWidget': false,  // Fermer le widget après cette réponse
      fullDetails: {...},
      credentials: {...} // Si nécessaire (déconseillé)
    }
  };
});
```

**Bonnes pratiques**:
- Utilisez le pattern "Use this when..." dans la description
- Ajoutez "Do NOT use for..." pour éviter les mauvais usages
- Gardez `structuredContent` léger (<4k tokens idéalement)
- Mettez les données lourdes dans `_meta` (jamais vu par le modèle)
- Rendez les handlers idempotents (le modèle peut retry)

### 3. Serveur HTTP avec endpoint /mcp

```javascript
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Healthcheck
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // MCP endpoint (Streamable HTTP - GET et POST unifiés)
  if (req.url === '/mcp' || req.url === '/') {
    // Handle MCP protocol avec StreamableHTTPServerTransport
    // Support streaming natif (GET pour SSE stream, POST pour messages)
  }
});

server.listen(8787);
```

**Requirements critiques**:
- ✅ HTTPS obligatoire en production
- ✅ Endpoint `/mcp` ou `/` responsive (GET et POST)
- ✅ Support Streamable HTTP (transport moderne recommandé par MCP)
- ✅ HTTP status codes appropriés
- ✅ Pas de buffering par load balancer (casse le streaming)
- ⚠️ SSE est deprecated - utiliser Streamable HTTP à la place

---

## Widget UI - Développement

> **📚 Bonnes Pratiques** : Voir la section [Bonnes Pratiques : Développement de Widgets](#bonnes-pratiques--développement-de-widgets) pour les leçons apprises lors du développement de widgets (extraction de données, polling, debugging).

### Structure HTML de base

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Styles inline - pas de CSS externe autorisé */
  </style>
</head>
<body>
  <div id="app"></div>

  <script>
    // Accès au runtime OpenAI
    const { toolOutput, toolInput, widgetState } = window.openai;

    // Initialiser depuis l'état sauvegardé
    if (widgetState) {
      // Restaurer l'état UI
    }

    // Utiliser les données du serveur
    // ⚠️ IMPORTANT : Pour une extraction robuste avec polling et gestion d'erreurs,
    // voir la section "Bonnes Pratiques : Développement de Widgets"
    if (toolOutput?.structuredContent) {
      // Render UI avec structuredContent
    }

    if (toolOutput?._meta) {
      // Utiliser les données riches
    }

    // Persister l'état
    function saveState(newState) {
      window.openai.setWidgetState(newState);
    }

    // Appeler le serveur
    async function performAction(payload) {
      const result = await window.openai.callTool('my_tool', payload);
      // result contient structuredContent et _meta
    }
  </script>
</body>
</html>
```

### API window.openai disponible

| Propriété/Méthode | Description |
|-------------------|-------------|
| `toolOutput` | Données retournées par le serveur (structuredContent + _meta) |
| `toolInput` | Paramètres d'entrée de l'outil |
| `toolResponseMetadata` | Métadonnées de la réponse (widgetSessionId, etc.) |
| `widgetState` | État persisté du widget (scoped par widget instance) |
| `displayMode` | Mode d'affichage: inline/carousel/fullscreen/pip |
| `maxHeight` | Hauteur max disponible (pour responsive) |
| `locale` | Locale de l'utilisateur (RFC 4647) |
| `callTool(name, payload)` | Invoque un outil serveur (nécessite widgetAccessible: true) |
| `setWidgetState(state)` | Persiste l'état du widget (envoyé au modèle, <4k tokens) |
| `sendFollowUpMessage(text)` | Envoie un message dans ChatGPT |
| `requestClose()` | Ferme le widget depuis l'UI |
| `requestDisplayMode(mode)` | Demande un changement de layout (inline/PiP/fullscreen) |
| `requestModal(options)` | Ouvre un overlay contrôlé par l'hôte (checkout, détails) |

### React Helper Hooks

```javascript
import { useEffect, useState } from 'react';

// Hook pour lire une valeur globale
function useOpenAiGlobal(key) {
  const [value, setValue] = useState(window.openai?.[key]);
  
  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.key === key) {
        setValue(event.detail.value);
      }
    };
    window.addEventListener('openai:set_globals', handler);
    return () => window.removeEventListener('openai:set_globals', handler);
  }, [key]);
  
  return value;
}

// Hook pour widget state
function useWidgetState(initialState) {
  const widgetState = useOpenAiGlobal('widgetState');
  const [state, setState] = useState(widgetState || initialState);
  
  useEffect(() => {
    if (widgetState) setState(widgetState);
  }, [widgetState]);
  
  const updateState = (newState) => {
    setState(newState);
    window.openai.setWidgetState(newState);
  };
  
  return [state, updateState];
}
```

### Restrictions du Sandbox

- ❌ Pas d'accès `alert()`, `confirm()`, `prompt()`
- ❌ Pas d'accès clipboard direct
- ❌ CSP strict - pas de scripts externes
- ✅ Tous les assets doivent être inline (CSS, JS, images en base64)
- ✅ Standard routing APIs supportées (React Router, etc.)

### Widget State Management

**Important**: Le widget state est scoped à l'instance du widget sur un message spécifique.

- `window.openai.setWidgetState(payload)` persiste l'état
- L'état est rehydraté uniquement pour ce widget (message_id/widgetId)
- L'état ne voyage PAS entre widgets ou conversations
- Le payload est envoyé au modèle - gardez-le <4k tokens
- Les follow-ups dans le même widget gardent le même état
- Les nouveaux messages créent un nouveau widget avec état vide

---

## Gestion d'État (State Management)

> **Source**: [Managing State](https://developers.openai.com/apps-sdk/build/state-management/)
> 
> Guide complet sur comment gérer business data, UI state, et cross-session state dans les apps ChatGPT.

### Vue d'ensemble

L'état dans une app ChatGPT tombe dans trois catégories:

| Type d'état | Propriétaire | Lifetime | Exemples |
|-------------|-------------|----------|----------|
| **Business data (authoritative)** | MCP server ou backend service | Long-lived | Tasks, tickets, documents |
| **UI state (ephemeral)** | Instance du widget dans ChatGPT | Uniquement pour le widget actif | Selected row, expanded panel, sort order |
| **Cross-session state (durable)** | Votre backend ou storage | Cross-session et cross-conversation | Saved filters, view mode, workspace selection |

Placer chaque pièce d'état où elle appartient pour que l'UI reste consistante et le chat matche l'intent attendu.

### Comment les Composants UI vivent dans ChatGPT

Quand votre app retourne un composant UI custom, ChatGPT rend ce composant dans un widget qui est lié à un message spécifique dans la conversation. Le widget persiste tant que ce message existe dans le thread.

**Comportement clé**:

- ✅ **Widgets sont message-scoped**: Chaque réponse qui retourne un widget crée une instance fraîche avec son propre UI state
- ✅ **UI state stick avec le widget**: Quand vous rouvrez ou refresh le même message, le widget restore son saved state (selected row, expanded panel, etc.)
- ✅ **Server data drive la vérité**: Le widget ne voit updated business data que quand un tool call complète, puis il réapplique son local UI state sur top de ce snapshot

**Mental model**:

```
Server (MCP or backend)
│
├── Authoritative business data (source of truth)
│
▼
ChatGPT Widget
│
├── Ephemeral UI state (visual behavior)
│
└── Rendered view = authoritative data + UI state
```

Cette séparation garde l'interaction UI smooth tout en assurant data correctness.

### 1. Business State (Authoritative)

Business data est la **source of truth**.  
Il devrait vivre sur votre MCP server ou backend, **pas** dans le widget.

Quand l'utilisateur prend une action:

1. L'UI appelle un server tool
2. Le serveur update les données
3. Le serveur retourne le nouveau authoritative snapshot
4. Le widget re-render en utilisant ce snapshot

Cela prévient divergence entre UI et serveur.

**Exemple (Node.js)**:

```javascript
import { Server } from "@modelcontextprotocol/sdk/server";
import { jsonSchema } from "@modelcontextprotocol/sdk/schema";

const tasks = new Map(); // remplacer par votre DB ou service externe
let nextId = 1;

const server = new Server({
  tools: {
    get_tasks: {
      description: "Return all tasks",
      inputSchema: jsonSchema.object({}),
      async run() {
        return {
          structuredContent: {
            type: "taskList",
            tasks: Array.from(tasks.values()),
          }
        };
      }
    },
    add_task: {
      description: "Add a new task",
      inputSchema: jsonSchema.object({ title: jsonSchema.string() }),
      async run({ title }) {
        const id = `task-${nextId++}`;
        tasks.set(id, { id, title, done: false });

        // Toujours retourner updated authoritative state
        return this.tools.get_tasks.run({});
      }
    }
  }
});
```

**Bonnes pratiques**:
- ✅ Toujours retourner updated authoritative state après mutations
- ✅ Le serveur est la source of truth, pas le widget
- ✅ Le widget re-render avec les nouvelles données du serveur

### 2. UI State (Ephemeral)

UI state décrit **comment** les données sont vues, pas les données elles-mêmes.

Les widgets ne re-sync pas automatiquement UI state quand new server data arrive. Au lieu de ça, le widget garde son UI state et le réapplique quand authoritative data est rafraîchi.

**Store UI state** dans l'instance du widget en utilisant:

- `window.openai.widgetState` – lire le snapshot actuel de widget-scoped state
- `window.openai.setWidgetState(newState)` – écrire le prochain snapshot. L'appel est synchrone; persistence se passe en background

**React apps** devraient utiliser le hook `useWidgetState` fourni au lieu de lire globals directement. Le hook:

- Hydrate initial state depuis `window.openai.widgetState` (ou l'initializer que vous passez)
- Subscribe à future updates via `useOpenAiGlobal("widgetState")`
- Mirror writes back through `window.openai.setWidgetState`, donc le widget reste en sync même si multiple components mutent le même state

Parce que l'hôte persiste widget state de manière asynchrone, il n'y a rien à `await` quand vous appelez `window.openai.setWidgetState`. Traitez-le comme updating local component state et appelez-le immédiatement après chaque meaningful UI-state change.

**Exemple (React)**:

```javascript
import { useWidgetState } from "./use-widget-state";

export function TaskList({ data }) {
  const [widgetState, setWidgetState] = useWidgetState(() => ({
    selectedId: null,
  }));

  const selectTask = (id) => {
    setWidgetState((prev) => ({ ...prev, selectedId: id }));
  };

  return (
    <ul>
      {data.tasks.map((task) => (
        <li
          key={task.id}
          style={{
            fontWeight: widgetState?.selectedId === task.id ? "bold" : "normal",
          }}
          onClick={() => selectTask(task.id)}
        >
          {task.title}
        </li>
      ))}
    </ul>
  );
}
```

**Exemple (Vanilla JS)**:

```javascript
// ⚠️ NOTE : Pour une extraction robuste de toolOutput avec polling,
// voir la section "Bonnes Pratiques : Développement de Widgets"
const tasks = window.openai.toolOutput?.tasks ?? [];
let widgetState = window.openai.widgetState ?? { selectedId: null };

function selectTask(id) {
  widgetState = { ...widgetState, selectedId: id };
  window.openai.setWidgetState(widgetState);
  renderTasks();
}

function renderTasks() {
  const list = document.querySelector("#task-list");
  list.innerHTML = tasks
    .map(
      (task) => `
        <li
          style="font-weight: ${widgetState.selectedId === task.id ? "bold" : "normal"}"
          onclick="selectTask('${task.id}')"
        >
          ${task.title}
        </li>
      `
    )
    .join("");
}

renderTasks();
```

**Bonnes pratiques**:
- ✅ UI state décrit comment les données sont vues (selected, expanded, sorted)
- ✅ UI state persiste uniquement pour l'instance du widget
- ✅ Appeler `setWidgetState` immédiatement après chaque change
- ✅ Ne pas await `setWidgetState` (c'est asynchrone en background)

### 3. Cross-Session State

Préférences qui doivent persister across conversations, devices, ou sessions devraient être stockées dans votre backend.

Apps SDK handle conversation state automatiquement, mais la plupart des apps real-world ont aussi besoin de durable storage. Vous pourriez:
- Cache fetched data
- Keep track de user preferences
- Persist artifacts créés dans un composant

Choisir d'ajouter une storage layer ajoute capabilities additionnelles, mais aussi complexité.

#### Bring Your Own Backend

Si vous runnez déjà une API ou avez besoin de multi-user collaboration, intégrez avec votre existing storage layer. Dans ce modèle:

- ✅ **Authentifier l'utilisateur via OAuth** (voir Authentication) pour mapper ChatGPT identities à vos internal accounts
- ✅ **Utiliser les APIs de votre backend** pour fetch et muter data. Garder latency low; users expect components à render en quelques centaines de millisecondes
- ✅ **Retourner sufficient structured content** pour que le modèle comprenne les données même si le composant fail à load

Quand vous roll your own storage, planifier pour:

- ✅ **Data residency et compliance** – s'assurer d'avoir agreements en place avant de transférer PII ou regulated data
- ✅ **Rate limits** – protéger vos APIs contre bursty traffic depuis model retries ou multiple active components
- ✅ **Versioning** – inclure schema versions dans stored objects pour pouvoir les migrer sans break existing conversations

**Exemple: Widget invoque un tool (React)**:

```javascript
import { useState } from "react";

export function PreferencesForm({ userId, initialPreferences }) {
  const [formState, setFormState] = useState(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  async function savePreferences(next) {
    setIsSaving(true);
    setFormState(next);
    window.openai.setWidgetState(next);

    const result = await window.openai.callTool("set_preferences", {
      userId,
      preferences: next,
    });

    const updated = result?.structuredContent?.preferences ?? next;
    setFormState(updated);
    window.openai.setWidgetState(updated);
    setIsSaving(false);
  }

  return (
    <form>
      {/* form fields bound to formState */}
      <button type="button" disabled={isSaving} onClick={() => savePreferences(formState)}>
        {isSaving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
```

**Exemple: Server handle le tool (Node.js)**:

```javascript
import { Server } from "@modelcontextprotocol/sdk/server";
import { jsonSchema } from "@modelcontextprotocol/sdk/schema";
import { request } from "undici";

// Helpers qui appellent votre existing backend API
async function readPreferences(userId) {
  const response = await request(`https://api.example.com/users/${userId}/preferences`, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
  });
  if (response.statusCode === 404) return {};
  if (response.statusCode >= 400) throw new Error("Failed to load preferences");
  return await response.body.json();
}

async function writePreferences(userId, preferences) {
  const response = await request(`https://api.example.com/users/${userId}/preferences`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(preferences)
  });
  if (response.statusCode >= 400) throw new Error("Failed to save preferences");
  return await response.body.json();
}

const server = new Server({
  tools: {
    get_preferences: {
      inputSchema: jsonSchema.object({ userId: jsonSchema.string() }),
      async run({ userId }) {
        const preferences = await readPreferences(userId);
        return { structuredContent: { type: "preferences", preferences } };
      }
    },
    set_preferences: {
      inputSchema: jsonSchema.object({
        userId: jsonSchema.string(),
        preferences: jsonSchema.object({})
      }),
      async run({ userId, preferences }) {
        const updated = await writePreferences(userId, preferences);
        return { structuredContent: { type: "preferences", preferences: updated } };
      }
    }
  }
});
```

### Résumé

- ✅ Store **business data** sur le serveur
- ✅ Store **UI state** dans le widget en utilisant `window.openai.widgetState`, `window.openai.setWidgetState`, ou le hook `useWidgetState`
- ✅ Store **cross-session state** dans backend storage que vous contrôlez
- ✅ Widget state persiste uniquement pour l'instance du widget appartenant à un message spécifique
- ❌ Éviter d'utiliser `localStorage` pour core state

---

## Structure des Réponses d'Outils

```javascript
{
  content: [
    {
      type: 'text',
      text: 'Narration markdown pour le modèle et l\'utilisateur'
    }
  ],

  structuredContent: {
    // JSON CONCIS visible par widget ET modèle
    // Impacte les performances si trop gros
    items: [...],
    summary: "..."
  },

  _meta: {
    // Données RICHES/SENSIBLES uniquement pour le widget
    // JAMAIS vu par le modèle
    'openai/outputTemplate': 'template://my-widget',
    'openai/closeWidget': false,
    'openai/widgetSessionId': 'session-id',
    fullDetails: {...},
    credentials: {...} // Si nécessaire (déconseillé)
  }
}
```

**Règle d'or**: Garder `structuredContent` léger. "Oversized payloads degrade model performance."

---

## Modes d'Affichage (Référence Rapide)

| Mode | Usage | Caractéristiques |
|------|-------|------------------|
| **Inline Card** | Cartes légères dans la conversation | 1-2 actions max, données simples, pas de nested scrolling |
| **Inline Carousel** | Comparaison d'items similaires | 3-8 items optimaux, swipe horizontal, 1 CTA par item |
| **Fullscreen** | Expériences riches | Composer ChatGPT reste accessible, multi-step workflows |
| **Picture-in-Picture** | Activités parallèles | Fenêtre flottante (jeux, collab), reste visible pendant conversation |

Détecter le mode: `window.openai.displayMode`

Changer le mode: `window.openai.requestDisplayMode('fullscreen')`

**Note**: Pour les détails complets sur chaque mode, voir la section [Display Modes](#display-modes) dans UI Guidelines.

---

## Authentification OAuth 2.1

### Composants

- **Resource server** – votre serveur MCP, qui expose les outils et vérifie les tokens
- **Authorization server** – votre identity provider (Auth0, Okta, Cognito, etc.)
- **Client** – ChatGPT agissant pour l'utilisateur (supporte DCR et PKCE)

### Étapes d'implémentation

#### 1. Host protected resource metadata

Exposez un endpoint `GET /.well-known/oauth-protected-resource`:

```json
{
  "resource": "https://your-mcp.example.com",
  "authorization_servers": [
    "https://auth.yourcompany.com"
  ],
  "scopes_supported": ["read", "write"],
  "resource_documentation": "https://docs.example.com"
}
```

#### 2. Publish OAuth metadata

Votre identity provider doit exposer:
- `/.well-known/oauth-authorization-server` (OAuth 2.0)
- `/.well-known/openid-configuration` (OpenID Connect)

Champs requis:
- `authorization_endpoint`, `token_endpoint`, `jwks_uri`
- `registration_endpoint` (pour dynamic client registration)
- `code_challenge_methods_supported: ["S256"]` (PKCE obligatoire)

Redirect URL: `https://chatgpt.com/connector_platform_oauth_redirect`

#### 3. Security Schemes par outil

```javascript
server.registerTool('create_doc', {
  // ...
  securitySchemes: [
    { type: 'noauth' },  // Optionnel: peut être appelé anonymement
    { type: 'oauth2', scopes: ['docs.write'] }  // Nécessite OAuth
  ]
});
```

#### 4. Token verification

Vérifiez le token sur chaque requête:
- Signature (via JWKS)
- Issuer (iss)
- Audience (aud ou resource claim)
- Expiration (exp/nbf)
- Scopes

Si invalide, retournez `401` avec header `WWW-Authenticate`:

```
WWW-Authenticate: Bearer resource_metadata="https://your-mcp.example.com/.well-known/oauth-protected-resource", error="insufficient_scope", error_description="You need to login to continue"
```

#### 5. Trigger authentication UI

Pour déclencher l'UI OAuth, retournez dans la réponse d'erreur:

```javascript
{
  "isError": true,
  "content": [{"type": "text", "text": "Authentication required"}],
  "_meta": {
    "mcp/www_authenticate": [
      "Bearer resource_metadata=\"https://your-mcp.example.com/.well-known/oauth-protected-resource\", error=\"insufficient_scope\", error_description=\"You need to login to continue\""
    ]
  }
}
```

---

## Développement Local

### 1. Lancer le serveur

```bash
node server.js
# MCP server listening on http://localhost:8787/mcp
```

### 2. Tester avec MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest http://localhost:8787/mcp
```

### 3. Exposer publiquement (dev)

```bash
ngrok http 8787
# Copier l'URL HTTPS générée
```

### 4. Connecter à ChatGPT

1. Activer le mode développeur dans Settings → Apps & Connectors → Advanced settings
2. Créer un connecteur avec l'URL `/mcp` publique
3. Ajouter le connecteur au chat
4. **Rafraîchir le connecteur après chaque modification du serveur**

---

## UX Principles

> **Source**: [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles/)

### Les 5 valeurs fondamentales

1. **Conversational** - S'intègre naturellement dans le flow ChatGPT
2. **Intelligent** - Comprend le contexte et anticipe les besoins
3. **Simple** - Une action claire par interaction
4. **Responsive** - Rapide et léger (<100-200ms idéal)
5. **Accessible** - Support des technologies d'assistance (WCAG AA)

### Bons cas d'usage

✅ Tâches conversationnelles (réservations, commandes, scheduling)
✅ Tâches bornées dans le temps (début/fin clairs)
✅ Résultats visuellement résumables
✅ Extension additive de ChatGPT

### Mauvais cas d'usage

❌ Contenu long ou statique
❌ Workflows complexes multi-étapes
❌ Publicités
❌ Affichage d'infos sensibles
❌ Duplication de fonctions ChatGPT

### Checklist avant publication

- [ ] **Conversational value** – Au moins une capacité utilise les forces de ChatGPT
- [ ] **Beyond base ChatGPT** – Fournit nouvelles connaissances/actions/présentation
- [ ] **Atomic actions** – Outils indivisibles, self-contained
- [ ] **Helpful UI only** – Le widget ajoute de la valeur vs texte simple
- [ ] **End-to-end completion** – Utilisateur peut finir une tâche dans ChatGPT
- [ ] **Performance** – Réponse rapide (<200ms idéal)
- [ ] **Discoverability** – Facile d'imaginer des prompts pertinents
- [ ] **Platform fit** – Utilise les comportements de la plateforme

---

## UI Guidelines

> **Source**: [UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines/)
> 
> Guidelines pour concevoir de belles apps ChatGPT. Ces guidelines sont nécessaires pour une **distribution améliorée** (merchandising, suggestions proactives).

### Vue d'ensemble

Les apps sont des expériences construites par les développeurs qui vivent dans ChatGPT. Elles étendent ce que les utilisateurs peuvent faire sans casser le flow de conversation, apparaissant via des cards légères, carousels, vues fullscreen, et autres display modes qui s'intègrent de manière transparente dans l'interface ChatGPT.

**Important**: Avant de commencer à designer visuellement, assurez-vous d'avoir suivi les [UX principles](#ux-principles).

### Design System

OpenAI fournit un **Apps SDK UI design system** pour vous aider à designer des apps de haute qualité qui se sentent natives à ChatGPT:

- **Styling foundations** avec Tailwind
- **CSS variable design tokens**
- **Library de composants** bien craftés et accessibles
- **Figma component library** disponible

**Note**: Utiliser Apps SDK UI n'est **pas une requirement** pour construire votre app, mais cela rendra le développement plus rapide et plus facile, de manière cohérente avec le design system ChatGPT.

**Ressources**:
- [Apps SDK UI](https://openai.github.io/apps-sdk-ui/)
- Figma component library (à utiliser avant de coder)

---

## Display Modes

Les display modes sont les surfaces que les développeurs utilisent pour créer des expériences dans ChatGPT. Chaque mode est conçu pour un type d'interaction spécifique, des confirmations rapides aux workflows immersifs.

### Inline

Le mode inline apparaît directement dans le flow de conversation. Les surfaces inline apparaissent toujours **avant** la réponse générée par le modèle. Toute app apparaît initialement en inline.

**Layout**:
- **Icon & tool call**: Label avec nom de l'app et icône
- **Inline display**: Affichage léger avec contenu de l'app embed au-dessus de la réponse du modèle
- **Follow-up**: Réponse courte générée par le modèle après le widget pour suggérer edits, next steps, ou actions liées. Éviter contenu redondant avec la card.

#### Inline Card

Widgets légers, single-purpose embed directement dans la conversation. Fournissent confirmations rapides, actions simples, ou visual aids.

**When to use**:
- ✅ Une seule action ou décision (ex: confirmer une réservation)
- ✅ Petites quantités de données structurées (ex: map, order summary, status rapide)
- ✅ Widget ou outil fully self-contained (ex: audio player, score card)

**Layout**:
- **Title**: Inclure un titre si la card est document-based ou contient items avec parent element (ex: songs dans playlist)
- **Expand**: Utiliser pour ouvrir fullscreen si la card contient rich media ou interactivité (map, diagram interactif)
- **Show more**: Utiliser pour révéler items additionnels si plusieurs résultats sont présentés en liste
- **Edit controls**: Fournir support inline pour réponses ChatGPT sans overwhelm la conversation
- **Primary actions**: Limiter à **deux actions maximum**, placées en bas de card. Actions doivent effectuer soit un conversation turn soit un tool call.

**Interaction**:
- **States**: Edits faits sont persistés
- **Simple direct edits**: Si approprié, texte editable inline permet edits rapides sans prompt le modèle
- **Dynamic layout**: Card layout peut expand sa hauteur pour matcher son contenu jusqu'à la hauteur du mobile viewport

**Rules of thumb**:
- ✅ **Limiter primary actions par card**: Maximum 2 actions (1 primary CTA + 1 optional secondary CTA)
- ❌ **Pas de deep navigation ou multiple views** dans une card. Cards ne doivent pas contenir multiple drill-ins, tabs, ou deeper navigation. Considérer splitter en separate cards ou tool actions
- ❌ **Pas de nested scrolling**. Cards doivent auto-fit leur contenu et prévenir internal scrolling
- ❌ **Pas de duplicative inputs**. Ne pas répliquer features ChatGPT dans une card

#### Inline Carousel

Un set de cards présentées côte à côte, permettant aux utilisateurs de scanner rapidement et choisir parmi plusieurs options.

**When to use**:
- ✅ Présenter une petite liste d'items similaires (ex: restaurants, playlists, events)
- ✅ Items ont plus de visual content et metadata que ce qui peut tenir dans simple rows

**Layout**:
- **Image**: Items doivent toujours inclure une image ou visual
- **Title**: Carousel items doivent typiquement inclure un titre pour expliquer le contenu
- **Metadata**: Utiliser metadata pour montrer l'info la plus importante et pertinente sur l'item dans le contexte de la réponse. Éviter plus de deux lignes de texte
- **Badge**: Utiliser badge pour montrer supporting context où approprié
- **Actions**: Fournir un seul CTA clair par item quand possible

**Rules of thumb**:
- ✅ Garder **3–8 items par carousel** pour scannability
- ✅ Réduire metadata aux détails les plus pertinents, maximum 3 lignes
- ✅ Chaque card peut avoir un seul, optional CTA (ex: "Book" ou "Play")
- ✅ Utiliser visual hierarchy consistante across cards

### Fullscreen

Expériences immersives qui s'étendent au-delà de la inline card, donnant aux utilisateurs l'espace pour multi-step workflows ou exploration plus profonde. Le ChatGPT composer reste overlaid, permettant aux utilisateurs de continuer à "parler à l'app" via conversation naturelle dans le contexte de la vue fullscreen.

**When to use**:
- ✅ Rich tasks qui ne peuvent pas être réduites à une seule card (ex: map explorable avec pins, rich editing canvas, diagram interactif)
- ✅ Browsing detailed content (ex: real estate listings, menus)

**Layout**:
- **System close**: Ferme la sheet ou vue
- **Fullscreen view**: Zone de contenu
- **Composer**: Composer natif ChatGPT, permettant à l'utilisateur de follow-up dans le contexte de la vue fullscreen

**Interaction**:
- **Chat sheet**: Maintenir contexte conversationnel alongside la surface fullscreen
- **Thinking**: Le composer input "shimmers" pour montrer qu'une réponse stream
- **Response**: Quand le modèle complète sa réponse, un snippet éphemère et tronqué s'affiche au-dessus du composer. Tapping ouvre le chat sheet

**Rules of thumb**:
- ✅ **Designer UX pour travailler avec system composer**. Le composer est toujours présent en fullscreen, donc s'assurer que l'expérience supporte conversational prompts qui peuvent trigger tool calls et se sentent naturels
- ✅ **Utiliser fullscreen pour approfondir engagement**, pas pour répliquer votre native app wholesale

### Picture-in-Picture (PiP)

Fenêtre flottante persistante dans ChatGPT optimisée pour sessions ongoing ou live comme games ou videos. PiP reste visible pendant que la conversation continue, et peut update dynamiquement en réponse aux prompts utilisateur.

**When to use**:
- ✅ **Activités qui run en parallèle avec conversation**, comme un game, live collaboration, quiz, ou learning session
- ✅ **Situations où le PiP widget peut réagir au chat input**, par exemple continuer un game round ou rafraîchir live data basé sur une requête utilisateur

**Interaction**:
- **Activated**: On scroll, la fenêtre PiP reste fixée au top du viewport
- **Pinned**: Le PiP reste fixé jusqu'à ce que l'utilisateur le dismiss ou la session se termine
- **Session ends**: Le PiP retourne à une position inline et scroll away

**Rules of thumb**:
- ✅ **S'assurer que le PiP state peut update ou répondre** quand utilisateurs interagissent via system composer
- ✅ **Fermer PiP automatiquement** quand la session se termine
- ❌ **Ne pas overloader PiP avec controls ou static content** mieux adaptés pour inline ou fullscreen

---

## Visual Design Guidelines

Un look and feel consistant est ce qui fait que les tools construits par les partenaires se sentent comme une partie naturelle de ChatGPT. Les visual guidelines assurent que les expériences partenaires restent familières, accessibles, et trustworthies, tout en laissant de la place pour brand expression aux bons endroits.

### Pourquoi c'est important

La consistance visuelle et UX protège l'expérience utilisateur globale de ChatGPT. En suivant ces guidelines, les partenaires assurent que leurs tools se sentent familiers aux utilisateurs, maintiennent la confiance dans le système, et délivrent de la valeur sans distraction.

### Color

Les palettes définies par le système assurent que les actions et réponses se sentent toujours consistantes avec ChatGPT. Les partenaires peuvent ajouter branding via accents, icons, ou inline imagery, mais ne doivent **pas** redéfinir les system colors.

**Rules of thumb**:
- ✅ Utiliser system colors pour text, icons, et spatial elements comme dividers
- ✅ Partner brand accents (logos, icons) ne doivent **pas** override backgrounds ou text colors
- ❌ Éviter custom gradients ou patterns qui break le minimal look de ChatGPT
- ✅ Utiliser brand accent colors sur primary buttons dans app display modes

**Exemples**:
- ✅ Utiliser brand colors sur accents et badges. Ne pas changer text colors ou autres core component styles
- ❌ Ne pas appliquer colors sur backgrounds dans text areas

### Typography

ChatGPT utilise platform-native system fonts (SF Pro sur iOS, Roboto sur Android) pour assurer readability et accessibility across devices.

**Rules of thumb**:
- ✅ Toujours hériter du system font stack, respectant system sizing rules pour headings, body text, et captions
- ✅ Utiliser partner styling (bold, italic, highlights) uniquement dans content areas, pas pour structural UI
- ✅ Limiter variation en font size autant que possible, préférant body et body-small sizes
- ❌ Ne pas utiliser custom fonts, même en full screen modes. Utiliser system font variables partout où possible

### Spacing & Layout

Marges, padding, et alignment consistants gardent le contenu partenaire scannable et prévisible dans la conversation.

**Rules of thumb**:
- ✅ Utiliser system grid spacing pour cards, collections, et inspector panels
- ✅ Garder padding consistant et éviter cramming ou edge-to-edge text
- ✅ Respecter system specified corner rounds quand possible pour garder shapes consistants
- ✅ Maintenir visual hierarchy avec headline, supporting text, et CTA dans un ordre clair

### Icons & Imagery

L'iconographie système fournit clarté visuelle, tandis que les logos et images partenaires aident les utilisateurs à reconnaître le contexte de marque.

**Rules of thumb**:
- ✅ Utiliser soit system icons soit custom iconography qui fit dans le visual world de ChatGPT — monochromatic et outlined
- ❌ **Ne pas inclure votre logo comme partie de la réponse**. ChatGPT append toujours votre logo et app name avant que le widget soit rendu
- ✅ Toute imagery doit suivre enforced aspect ratios pour éviter distortion

### Accessibility

Toute expérience partenaire devrait être utilisable par le plus large public possible. L'accessibilité est une requirement, pas une option.

**Rules of thumb**:
- ✅ Text et background doivent maintenir un minimum contrast ratio (WCAG AA)
- ✅ Fournir alt text pour toutes les images
- ✅ Support text resizing sans casser layouts

---

## App Developer Guidelines

> **Source**: [App developer guidelines](https://developers.openai.com/apps-sdk/app-developer-guidelines/)
> 
> Ces guidelines définissent les **standards minimum** qu'une app doit respecter pour être listée dans le répertoire d'apps. Pour une **distribution améliorée** (merchandising, suggestions proactives), voir aussi les UI guidelines.

### Vue d'ensemble

Une excellente app ChatGPT doit:

- ✅ **Faire quelque chose de clairement utile** - Améliore substantiellement ChatGPT pour une tâche spécifique
- ✅ **Respecter la vie privée** - Limite les inputs au strict nécessaire, utilisateur contrôle les données partagées
- ✅ **Se comporter de manière prévisible** - Fait exactement ce qu'elle dit, pas de surprises
- ✅ **Être sûre pour un large public** - Conforme aux usage policies OpenAI, appropriée pour tous les utilisateurs
- ✅ **Être responsable** - Développeur vérifié qui supporte son travail

### App Fundamentals

#### Purpose and Originality

- ✅ Apps doivent servir un but clair et faire ce qu'elles promettent de manière fiable
- ✅ Utiliser uniquement la propriété intellectuelle que vous possédez ou avez la permission d'utiliser
- ❌ Designs trompeurs, copycats, impersonation, spam, ou frames statiques sans interaction seront rejetés
- ❌ Apps ne doivent pas impliquer qu'elles sont faites ou endossées par OpenAI

#### Quality and Reliability

- ✅ Apps doivent se comporter de manière prévisible et fiable
- ✅ Résultats doivent être précis et pertinents à l'input utilisateur
- ✅ Erreurs doivent être bien gérées avec messages clairs ou fallback behaviors
- ✅ Apps doivent être **thoroughly tested** avant soumission (stabilité, réactivité, faible latence)
- ❌ Apps qui crash, hang, ou montrent un comportement incohérent seront rejetées
- ❌ Apps soumises comme betas, trials, ou demos ne seront **pas acceptées**

#### Metadata

- ✅ Noms et descriptions d'apps doivent être clairs, précis, et faciles à comprendre
- ✅ Screenshots doivent montrer uniquement la fonctionnalité réelle de l'app
- ✅ Titres d'outils et annotations doivent rendre évident ce que chaque outil fait
- ✅ Doit être évident si un outil est read-only ou peut faire des changements

#### Authentication and Permissions

- ✅ Si l'app nécessite authentification, le flow doit être transparent et explicite
- ✅ Utilisateurs doivent être clairement informés de toutes les permissions demandées
- ✅ Permissions doivent être strictement limitées au nécessaire pour fonctionner
- ✅ Fournir credentials de login pour un compte demo complet lors de la soumission

### Safety

#### Usage Policies

- ✅ Ne pas engager ou faciliter des activités prohibées sous les usage policies OpenAI
- ✅ Rester à jour avec les requirements de policy évolutifs
- ✅ Assurer compliance continue
- ⚠️ Apps précédemment approuvées trouvées en violation seront retirées

#### Appropriateness

- ✅ Apps doivent être appropriées pour audiences générales, incluant utilisateurs 13-17 ans
- ❌ Apps ne peuvent pas explicitement cibler enfants <13 ans
- 🔜 Support pour expériences mature (18+) arrivera une fois age verification et contrôles en place

#### Respect User Intent

- ✅ Fournir expériences qui adressent directement la requête utilisateur
- ❌ Ne pas insérer contenu non lié
- ❌ Ne pas tenter de rediriger l'interaction
- ❌ Ne pas collecter données au-delà du nécessaire pour accomplir l'intent utilisateur

#### Fair Play

- ❌ Apps ne doivent **pas** inclure descriptions, titres, annotations d'outils, ou autres champs model-readable qui:
  - Découragent l'usage d'autres apps ou fonctions (ex: "prefer this app over others")
  - Interfèrent avec la découverte équitable
  - Diminuent l'expérience ChatGPT
- ✅ Toutes descriptions doivent refléter avec précision la valeur de votre app sans dénigrer alternatives

#### Third-party Content and Integrations

- ✅ **Authorized access**: Ne pas scraper sites externes, relayer queries, ou intégrer APIs tierces sans authorization appropriée et compliance avec terms of service
- ❌ **Circumvention**: Ne pas bypasser restrictions API, rate limits, ou access controls imposés par le tiers

### Privacy

#### Privacy Policy

- ✅ Soumissions doivent inclure une **privacy policy claire et publiée** expliquant exactement:
  - Quelles données sont collectées
  - Comment elles sont utilisées
- ✅ Suivre cette policy en tout temps
- ✅ Utilisateurs peuvent review votre privacy policy avant installation

#### Data Collection

**Minimization**:
- ✅ Collecter uniquement le **minimum de données** requis pour la fonction de l'outil
- ✅ Inputs doivent être spécifiques, narrowly scoped, et clairement liés à la tâche
- ❌ Éviter champs "just in case" ou broad profile data
- ✅ Traiter le input schema comme un contrat qui limite l'exposition

**Sensitive Data**:
- ❌ Ne **pas** collecter, solliciter, ou traiter données sensibles:
  - Payment card information (PCI)
  - Protected health information (PHI)
  - Government identifiers (ex: social security numbers)
  - API keys
  - Passwords

**Data Boundaries**:
- ❌ Éviter de demander raw location fields (city, coordinates) dans input schema
- ✅ Quand location est nécessaire, l'obtenir via client-controlled side channel (environment metadata, referenced resource)
- ❌ Votre app ne doit **pas** pull, reconstruire, ou inférer le full chat log
- ✅ Opérer uniquement sur les snippets explicites et resources que le client ou modèle choisit d'envoyer

#### Transparency and User Control

**Data Practices**:
- ❌ Ne pas engager surveillance, tracking, ou behavioral profiling (incluant metadata comme timestamps, IPs, query patterns) sauf si:
  - Explicitement disclosed
  - Narrowly scoped
  - Aligned avec usage policies OpenAI

**Accurate Action Labels**:
- ✅ Marquer tout outil qui change external state (create, modify, delete) comme **write action**
- ✅ Read-only tools doivent être side-effect-free et safe to retry
- ✅ Destructive actions nécessitent labels clairs et friction (ex: confirmation)

**Preventing Data Exfiltration**:
- ✅ Toute action qui envoie données hors boundary actuelle (posting messages, sending emails, uploading files) doit être surfaced comme **write action**
- ✅ Permet au client de requérir user confirmation ou run en preview mode

### Developer Verification

#### Verification

- ✅ Toutes soumissions doivent venir d'individus ou organisations **vérifiés**
- ✅ Une fois le processus de soumission ouvert, confirmation d'identité et affiliation sera requise
- ⚠️ Misrepresentation répétée, hidden behavior, ou tentatives de gaming le système résulteront en removal du programme

#### Support Contact Details

- ✅ Fournir **customer support contact details** où end users peuvent vous joindre
- ✅ Garder cette information accurate et à jour

### After Submission

#### Reviews and Checks

- ⚠️ OpenAI peut effectuer automated scans ou manual reviews pour comprendre comment votre app fonctionne
- ⚠️ Si votre app est rejetée ou retirée, vous recevrez feedback et pouvez avoir l'opportunité d'appeler

#### Maintenance and Removal

- ⚠️ Apps qui sont inactive, instable, ou non-compliant peuvent être retirées
- ⚠️ OpenAI peut rejeter ou retirer toute app à tout moment et pour toute raison sans notice (legal concerns, security, policy violations)

#### Re-submission for Changes

- ⚠️ Une fois votre app listée dans le directory:
  - Tool names, signatures, et descriptions sont **locked**
  - Pour changer ou ajouter tools, vous devez **resubmit l'app pour review**

### Checklist de Compliance

Avant soumission, vérifier:

- [ ] App fait quelque chose de clairement utile et valuable
- [ ] Privacy policy claire et publiée
- [ ] Data collection minimisée (uniquement nécessaire)
- [ ] Pas de données sensibles collectées
- [ ] Write actions clairement labelées
- [ ] Read-only tools sont side-effect-free
- [ ] Metadata claire et précise (noms, descriptions, screenshots)
- [ ] App thoroughly tested (pas beta/demo)
- [ ] Support contact details fournis
- [ ] Compliance avec usage policies OpenAI
- [ ] Pas de contenu trompeur, copycat, ou impersonation
- [ ] Fair play: pas de dénigrement d'alternatives
- [ ] Third-party integrations autorisées et compliant

---

## Sécurité & Confidentialité

> **Source**: [Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy/)
> 
> Apps SDK donne à votre code accès aux données utilisateur, APIs tierces, et write actions. Traitez chaque connecteur comme du software de production.

### Principes fondamentaux

1. **Least Privilege** – Demander uniquement les scopes, storage access, et network permissions nécessaires
2. **Explicit User Consent** – S'assurer que les utilisateurs comprennent quand ils linkent des comptes ou accordent write access. S'appuyer sur les confirmation prompts de ChatGPT pour actions potentiellement destructives
3. **Defense in Depth** – Assumer que prompt injection et inputs malveillants atteindront votre serveur. Valider tout et garder audit logs

### Data Handling

#### Structured Content
- ✅ Inclure uniquement les données requises pour le prompt actuel
- ❌ Éviter d'embed secrets ou tokens dans component props
- ✅ Garder `structuredContent` léger (visible par le modèle)

#### Storage
- ✅ Décider combien de temps vous gardez user data
- ✅ Publier une **retention policy**
- ✅ Respecter deletion requests promptement

#### Logging
- ✅ **Redact PII** avant d'écrire dans logs
- ✅ Store correlation IDs pour debugging
- ❌ Éviter de stocker raw prompt text sauf si nécessaire

### Prompt Injection et Write Actions

Developer mode active full MCP access, incluant write tools. Mitiger les risques par:

- ✅ **Reviewer tool descriptions régulièrement** pour décourager misuse ("Do not use to delete records")
- ✅ **Valider tous les inputs server-side** même si le modèle les a fournis
- ✅ **Requérir confirmation humaine** pour opérations irréversibles

**Best practice**: Partager vos meilleurs prompts pour testing injections avec votre équipe QA pour qu'ils puissent probe weak spots tôt.

### Network Access

#### Widgets (Client-side)
Widgets run dans un iframe sandboxed avec strict Content Security Policy:
- ❌ Ne peuvent **pas** accéder à privileged browser APIs:
  - `window.alert`, `window.prompt`, `window.confirm`
  - `navigator.clipboard`
- ✅ Standard `fetch` requests autorisées uniquement quand elles comply avec CSP
- ✅ Travailler avec votre OpenAI partner si vous avez besoin de domaines allow-listed

#### Server-side
Server-side code n'a **pas** de network restrictions au-delà de ce que votre hosting environment enforce:
- ✅ Suivre best practices normales pour outbound calls (TLS verification, retries, timeouts)
- ✅ Valider toutes les réponses externes

### Authentication & Authorization

- ✅ Utiliser **OAuth 2.1 flows** avec PKCE et dynamic client registration quand intégrant external accounts
- ✅ **Vérifier et enforce scopes** sur chaque tool call
- ✅ **Rejeter tokens expirés ou malformés** avec `401` responses
- ✅ Pour built-in identity, éviter de stocker long-lived secrets; utiliser le provided auth context à la place

### Operational Readiness

Avant launch:

- ✅ **Run security reviews**, spécialement si vous handlez regulated data
- ✅ **Monitor pour anomalous traffic patterns**
- ✅ **Set up alerts** pour repeated errors ou failed auth attempts
- ✅ **Keep third-party dependencies patched** (React, SDKs, build tooling) pour mitiger supply chain risks

**Security et privacy sont foundational à user trust**. Bake-les dans votre planning, implementation, et deployment workflows plutôt que de les traiter comme un afterthought.

### Actions d'écriture vs Lecture seule

**Outils Read-Only**:
- ✅ `annotations: { readOnlyHint: true }`
- ✅ ChatGPT skip les prompts "Are you sure?"
- ✅ Doivent être side-effect-free et safe to retry

**Outils Write/Destructive**:
- ✅ `annotations: { destructiveHint: true }` si suppression/écrasement
- ✅ `annotations: { openWorldHint: true }` si publication publique
- ✅ Confirmation utilisateur explicite requise
- ✅ Clear labels (create/modify/delete)

### Sandbox & CSP

- ✅ Widgets en iframe sandboxed avec CSP strict
- ❌ APIs navigateur bloquées (alerts, clipboard)
- ❌ Pas de scripts externes autorisés
- ✅ Déclarer domaines CSP dans `_meta['openai/widgetCSP']`

---

## Optimisation des Métadonnées

> **Source**: [Optimize Metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata/)
> 
> ChatGPT décide quand appeler votre connecteur basé sur les métadonnées que vous fournissez. Des noms, descriptions, et docs de paramètres bien craftés augmentent le recall sur prompts pertinents et réduisent les activations accidentelles.

### Pourquoi les métadonnées sont importantes

Traitez les métadonnées comme du **product copy** — elles nécessitent itération, testing, et analytics. Des métadonnées bien craftées:
- ✅ Augmentent le recall sur prompts pertinents
- ✅ Réduisent les activations accidentelles
- ✅ Guident le modèle vers le bon outil au bon moment

### Créer un Golden Prompt Set

Avant de tuner les métadonnées, assemblez un dataset labellisé:

- **Direct prompts** – utilisateurs nomment explicitement votre produit ou source de données
- **Indirect prompts** – utilisateurs décrivent l'outcome qu'ils veulent sans nommer votre outil
- **Negative prompts** – cas où built-in tools ou autres connecteurs devraient gérer la requête

**Documenter** le comportement attendu pour chaque prompt (appeler votre outil, ne rien faire, ou utiliser une alternative). Vous réutiliserez ce set pendant les tests de régression.

### Rédiger des métadonnées qui guident le modèle

Pour chaque outil:

#### Name
- ✅ Pairer le domaine avec l'action (`calendar.create_event`)
- ✅ Format: `domain.action` pour clarté

#### Description
- ✅ Commencer avec **"Use this when..."** pour guider le modèle
- ✅ Appeler les cas interdits ("Do not use for reminders")
- ✅ Être spécifique sur quand utiliser vs ne pas utiliser

#### Parameter docs
- ✅ Décrire chaque argument clairement
- ✅ Inclure des exemples
- ✅ Utiliser enums pour valeurs contraintes

#### Read-only hint
- ✅ Annoter `readOnlyHint: true` sur outils qui ne mutent jamais l'état
- ✅ Permet à ChatGPT de streamliner les confirmations

**Exemple**:
```javascript
{
  name: 'calendar.create_event',
  title: 'Create Calendar Event',
  description: 'Use this when the user wants to create a new calendar event. ' +
               'Requires title, date, and time. ' +
               'Do NOT use for reminders or recurring events.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { 
        type: 'string',
        description: 'Event title (e.g., "Team Meeting")'
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Event date in YYYY-MM-DD format'
      },
      time: {
        type: 'string',
        description: 'Event time in HH:MM format (24-hour)'
      }
    },
    required: ['title', 'date', 'time']
  },
  annotations: {
    readOnlyHint: false  // Write action
  }
}
```

### Évaluer en Developer Mode

1. **Linker votre connecteur** dans ChatGPT developer mode
2. **Run through le golden prompt set** et enregistrer:
   - Quel outil a été sélectionné
   - Quels arguments ont été passés
   - Si le composant a rendu correctement
3. **Tracker pour chaque prompt**:
   - **Precision**: Le bon outil a-t-il été exécuté?
   - **Recall**: L'outil a-t-il été appelé quand il aurait dû?

Si le modèle choisit le mauvais outil, réviser les descriptions pour:
- Emphasiser le scénario prévu
- Rétrécir le scope de l'outil
- Clarifier les différences avec outils similaires

### Itérer méthodiquement

- ✅ **Changer un champ metadata à la fois** pour pouvoir attribuer les améliorations
- ✅ **Garder un log des révisions** avec timestamps et résultats de tests
- ✅ **Partager diffs avec reviewers** pour catch ambiguous copy avant déploiement

Après chaque révision, répéter l'évaluation. Viser **haute precision sur negative prompts** avant de chasser des améliorations marginales de recall.

### Monitoring en Production

Une fois votre connecteur live:

- ✅ **Review tool-call analytics hebdomadaire**. Spikes en "wrong tool" confirmations indiquent généralement metadata drift
- ✅ **Capturer user feedback** et update descriptions pour couvrir misconceptions communes
- ✅ **Scheduler periodic prompt replays**, spécialement après ajout de nouveaux outils ou changements de structured fields

**Traiter les métadonnées comme un asset vivant**. Plus vous êtes intentionnel avec wording et évaluation, plus la découverte et invocation deviennent faciles.

---

## Déploiement Production

> **Source**: [Deploy your app](https://developers.openai.com/apps-sdk/deploy/)

Une fois que vous avez un serveur MCP et un component bundle fonctionnels, hébergez-les derrière un endpoint HTTPS stable.

### Options de hosting

**Containers managés** (recommandé pour quick spin-up):
- Fly.io, Render, Railway
- TLS automatique
- Setup rapide

**Cloud serverless**:
- Google Cloud Run, Azure Container Apps
- Scale-to-zero
- ⚠️ Long cold starts peuvent interrompre streaming HTTP

**Kubernetes**:
- Pour teams qui runnent déjà des clusters
- Front vos pods avec un ingress controller qui supporte Streamable HTTP (GET/POST streaming)

**Requirements critiques**:
- ✅ `/mcp` ou `/` doit rester responsive (GET et POST)
- ✅ Support Streamable HTTP (transport moderne, remplace SSE deprecated)
- ✅ HTTP status codes appropriés pour erreurs

### Développement Local

Pendant le développement, exposez votre serveur local à ChatGPT en utilisant un tunnel comme ngrok:

```bash
ngrok http 8787
```

**Workflow d'itération**:
1. Garder le tunnel running pendant que vous itérez
2. Quand vous changez code:
   - Rebuild component bundle (`npm run build`)
   - Restart votre MCP server
   - Refresh le connecteur dans ChatGPT settings pour pull latest metadata

### Configuration Environnement

**Secrets**:
- ✅ Store API keys ou OAuth client secrets **en dehors** de votre repo
- ✅ Utiliser platform-specific secret managers
- ✅ Injecter comme environment variables

**Logging**:
- ✅ Logger tool-call IDs, request latency, et error payloads
- ✅ Aide à debug user reports une fois le connecteur live

**Observability**:
- ✅ Monitor CPU, memory, et request counts
- ✅ Right-size votre deployment basé sur usage

### Dogfood et Rollout

Avant de lancer largement:

- ✅ **Gate access** – garder votre connecteur derrière developer mode ou feature flags jusqu'à confiance en stabilité
- ✅ **Run golden prompts** – exercer les discovery prompts draftés pendant planning
- ✅ **Note precision/recall changes** avec chaque release
- ✅ **Capture artifacts** – enregistrer screenshots ou screen captures montrant le composant dans MCP Inspector et ChatGPT

Quand vous êtes prêt pour production:
- ✅ Update directory metadata
- ✅ Confirmer auth et storage sont configurés correctement
- ✅ Publier change notes

### Pre-launch checklist

- [ ] Restreindre accès (dev mode / feature flags)
- [ ] Tester avec prompts de découverte prévus
- [ ] Documenter exemples visuels
- [ ] Secrets dans gestionnaires de secrets
- [ ] Logging des tool calls et latency
- [ ] Monitoring resource usage
- [ ] Health checks configurés
- [ ] Rate limiting en place
- [ ] Error handling robuste

### Workflow de déploiement

1. Rebuild component bundle après changements
2. Restart MCP server
3. Refresh connector settings dans ChatGPT
4. Test avec prompts réels
5. Monitor logs et metrics

---

## Connecter depuis ChatGPT

> **Source**: [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt/)

### Avant de commencer

Vous pouvez tester votre app dans ChatGPT avec votre compte en utilisant **developer mode**.

**Note**: Publier votre app pour accès public n'est pas disponible actuellement, mais les soumissions seront acceptées plus tard cette année.

### Activer Developer Mode

1. Naviguer vers **Settings → Apps & Connectors → Advanced settings** (bas de la page)
2. Toggle **developer mode** si votre organisation le permet
3. Une fois developer mode actif, vous verrez un bouton **Create** sous **Settings → Apps & Connectors**

**Support**: ChatGPT Apps sont supportées sur tous les plans (Business, Enterprise, Education) depuis novembre 13, 2025.

### Créer un Connecteur

Une fois developer mode activé, vous pouvez créer un connecteur pour votre app:

1. **Assurer votre serveur MCP est reachable over HTTPS**
   - Pour développement local: exposer via ngrok ou Cloudflare Tunnel
   - URL publique: `https://abc123.ngrok.app/mcp`

2. **Dans ChatGPT**, naviguer vers **Settings → Connectors → Create**

3. **Fournir metadata**:
   - **Connector name** – titre user-facing (ex: "Kanban board")
   - **Description** – expliquer ce que fait le connecteur et quand l'utiliser. Le modèle utilise ce texte pendant discovery
   - **Connector URL** – endpoint public `/mcp` de votre serveur (ex: `https://abc123.ngrok.app/mcp`)

4. **Click Create**. Si la connexion réussit, vous verrez une liste des tools que votre serveur advertise. Si ça fail, référez-vous au guide Testing.

### Tester l'App

Une fois votre connecteur créé:

1. **Ouvrir un nouveau chat** dans ChatGPT
2. **Click le bouton +** près du message composer, puis **More**
3. **Choisir le connecteur** pour votre app dans la liste des tools disponibles
4. **Prompter le modèle** pour invoquer tools en disant quelque chose lié à votre app (ex: "What are my available tasks?")

**Note**: ChatGPT affiche tool-call payloads dans l'UI pour confirmer inputs et outputs. Write tools nécessitent confirmation manuelle sauf si vous choisissez de remember approvals pour la conversation.

### Mettre à jour le Connecteur

Quand vous changez votre tools list ou descriptions:

1. **Update votre MCP server** et redeploy (sauf si vous utilisez un serveur local)
2. **Dans Settings → Connectors**, click dans votre connecteur et choisir **Refresh**
3. **Vérifier** que la tool list update
4. **Tester** quelques prompts pour tester les flows updated

### Utiliser d'autres Clients

**API Playground**:
- Visiter [platform playground](https://platform.openai.com/chat)
- **Tools → Add → MCP Server**
- Coller le même endpoint HTTPS
- Utile pour raw request/response logs

**Mobile clients**:
- Une fois le connecteur linké sur ChatGPT web, il sera disponible sur ChatGPT mobile apps aussi
- Tester mobile layouts tôt si votre composant a custom controls

---

## Tester votre Intégration

> **Source**: [Test your integration](https://developers.openai.com/apps-sdk/deploy/testing/)

### Objectifs

Testing valide que votre connecteur se comporte de manière prévisible avant de l'exposer aux utilisateurs. Focus sur trois areas: tool correctness, component UX, et discovery precision.

### Unit Test vos Tool Handlers

- ✅ Exercer chaque tool function directement avec representative inputs
- ✅ Vérifier schema validation, error handling, et edge cases (empty results, missing IDs)
- ✅ Inclure automated tests pour authentication flows si vous issuez tokens ou requirez linking
- ✅ Garder test fixtures proches de votre code MCP pour qu'ils restent à jour

### Utiliser MCP Inspector pendant Développement

MCP Inspector est le moyen le plus rapide de debugger votre serveur localement:

1. **Run votre MCP server**
2. **Launch inspector**: `npx @modelcontextprotocol/inspector@latest`
3. **Enter votre server URL** (ex: `http://127.0.0.1:2091/mcp`)
4. **Click List Tools et Call Tool** pour inspecter raw requests et responses

Inspector rend components inline et surface errors immédiatement. Capturer screenshots pour votre launch review.

### Valider dans ChatGPT Developer Mode

Après que votre connecteur soit reachable over HTTPS:

1. **Linker** dans **Settings → Connectors → Developer mode**
2. **Toggle on** dans une nouvelle conversation
3. **Run through votre golden prompt set** (direct, indirect, negative)
4. **Enregistrer**:
   - Quand le modèle sélectionne le bon outil
   - Quels arguments il a passés
   - Si confirmation prompts apparaissent comme attendu
5. **Tester mobile layouts** en invoquant le connecteur dans ChatGPT iOS ou Android apps

### Connecter via API Playground

Si vous avez besoin de raw logs ou voulez tester sans le full ChatGPT UI:

1. **Ouvrir API Playground**: [platform.openai.com/chat](https://platform.openai.com/chat)
2. **Choose Tools → Add → MCP Server**
3. **Fournir votre endpoint HTTPS** et connecter
4. **Issue test prompts** et inspecter JSON request/response pairs dans le right-hand panel

### Regression Checklist avant Launch

- [ ] Tool list matche votre documentation et unused prototypes sont removed
- [ ] Structured content matche le declared outputSchema pour chaque tool
- [ ] Widgets rendent sans console errors, injectent leur propre styling, et restore state correctement
- [ ] OAuth ou custom auth flows retournent valid tokens et rejettent invalid ones avec meaningful messages
- [ ] Discovery se comporte comme attendu across votre golden prompts et ne trigger pas sur negative prompts

**Best practice**: Capturer findings dans un doc pour comparer résultats release over release. Consistent testing garde votre connecteur reliable pendant que ChatGPT et votre backend évoluent.

---

## Troubleshooting

> **Source**: [Troubleshooting](https://developers.openai.com/apps-sdk/deploy/troubleshooting/)

### Comment Trier les Problèmes

Quand quelque chose va mal (components fail to render, discovery missing prompts, auth loops), commencer par isoler quelle layer est responsable: server, component, ou ChatGPT client.

### Server-side Issues

**No tools listed**:
- ✅ Confirmer votre serveur est running
- ✅ Vérifier que vous vous connectez au endpoint `/mcp`
- ✅ Si vous avez changé ports, update connector URL et restart MCP Inspector

**Structured content only, no component**:
- ✅ Confirmer tool response set `_meta["openai/outputTemplate"]` à une ressource HTML enregistrée avec `mimeType: "text/html+skybridge"`
- ✅ Vérifier que la ressource load sans CSP errors

**Schema mismatch errors**:
- ✅ S'assurer que vos Pydantic ou TypeScript models matchent le schema advertised dans `outputSchema`
- ✅ Regenerate types après changements

**Slow responses**:
- ✅ Components se sentent sluggish quand tool calls prennent plus que quelques centaines de millisecondes
- ✅ Profiler backend calls et cache results quand possible

**Widget fails to load**:
- ✅ Ouvrir browser console (ou MCP Inspector logs) pour CSP violations ou missing bundles
- ✅ S'assurer que le HTML inlines votre compiled JS et que toutes dependencies sont bundled
- ✅ **Voir la section [Bonnes Pratiques : Développement de Widgets](#bonnes-pratiques--développement-de-widgets)** pour les patterns d'extraction de données, polling, et debugging

**Drag-and-drop ou editing ne persiste pas**:
- ✅ Vérifier que vous appelez `window.openai.setWidgetState` après chaque update
- ✅ Vérifier que vous rehydratez depuis `window.openai.widgetState` on mount

**Widget affiche "Données indisponibles" malgré réception des données**:
- ✅ **Voir la section [Bonnes Pratiques : Développement de Widgets](#bonnes-pratiques--développement-de-widgets)** pour les patterns d'extraction multi-sources, polling robuste, et debugging
- ✅ Vérifier que `_meta` n'est pas écrasé dans `http.ts`
- ✅ Comparer avec les widgets fonctionnels (`quarter-widget.html`, `weather-widget.html`)

**Layout problems on mobile**:
- ✅ Inspecter `window.openai.displayMode` et `window.openai.maxHeight` pour ajuster layout
- ✅ Éviter fixed heights ou hover-only actions

### Discovery et Entry-Point Issues

**Tool never triggers**:
- ✅ Revisiter vos metadata
- ✅ Réécrire descriptions avec "Use this when…" phrasing
- ✅ Update starter prompts
- ✅ Retester en utilisant votre golden prompt set

**Wrong tool selected**:
- ✅ Ajouter clarifying details aux tools similaires
- ✅ Spécifier disallowed scenarios dans la description
- ✅ Considérer splitter large tools en smaller, purpose-built ones

**Launcher ranking feels off**:
- ✅ Refresh votre directory metadata
- ✅ S'assurer que l'app icon et descriptions matchent ce que users expect

### Authentication Problems

**401 errors**:
- ✅ Inclure un header `WWW-Authenticate` dans la error response pour que ChatGPT sache démarrer le OAuth flow à nouveau
- ✅ Double-check issuer URLs et audience claims

**Dynamic client registration fails**:
- ✅ Confirmer que votre authorization server expose `registration_endpoint`
- ✅ Vérifier que newly created clients ont au moins une login connection enabled

### Deployment Problems

**Ngrok tunnel times out**:
- ✅ Restart le tunnel
- ✅ Vérifier que votre local server est running avant de partager l'URL
- ✅ Pour production, utiliser un stable hosting provider avec health checks

**Streaming breaks behind proxies**:
- ✅ S'assurer que votre load balancer ou CDN allow Streamable HTTP (GET/POST streaming) sans buffering
- ⚠️ SSE est deprecated - utiliser Streamable HTTP du SDK MCP officiel

### Quand Escalader

Si vous avez validé les points ci-dessus et le problème persiste:

1. **Collecter logs** (server, component console, ChatGPT tool call transcript) et screenshots
2. **Noter le prompt** que vous avez émis et tous confirmation dialogs
3. **Partager les détails** avec votre OpenAI partner contact pour qu'ils puissent reproduire le problème en interne

Un troubleshooting log crisp raccourcit turnaround time et garde votre connecteur reliable pour users.

---

## Workflow de Développement - Checklist

### Phase 1: Plan
- [ ] Définir cas d'usage (conversationnel, borné, visuellement résumable?)
- [ ] Identifier outils nécessaires
- [ ] Sketcher UI et modes d'affichage

### Phase 2: Build
- [ ] Setup serveur MCP avec `/mcp` endpoint
- [ ] Register templates (`text/html+skybridge`)
- [ ] Register tools avec metadata complète
- [ ] Implémenter widgets avec `window.openai`
- [ ] Tester localement avec MCP Inspector

### Phase 3: Deploy
- [ ] Tunnel ngrok pour tests ChatGPT (dev)
- [ ] Deploy sur hosting HTTPS
- [ ] Créer connector dans ChatGPT
- [ ] Test end-to-end avec prompts réels

### Phase 4: Polish
- [ ] Optimiser `structuredContent` (garder léger)
- [ ] Vérifier accessibilité (WCAG AA)
- [ ] Review sécurité (input validation, auth)
- [ ] Documenter data retention policy
- [ ] Security review si données régulées

---

## Exemples de Code Minimal

### Serveur MCP minimal (TypeScript)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import http from 'http';
import fs from 'fs';

const server = new Server({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Register template
server.registerResource({
  uri: 'template://widget',
  name: 'Widget',
  mimeType: 'text/html+skybridge',
  text: async () => fs.readFileSync('./widget.html', 'utf-8')
});

// Register tool
server.registerTool({
  name: 'get_data',
  title: 'Get Data',
  description: 'Use this to fetch data',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query']
  },
  annotations: {
    readOnlyHint: true
  },
  _meta: { 
    'openai/outputTemplate': 'template://widget',
    'openai/widgetAccessible': true
  }
}, async ({ query }) => ({
  content: [{ type: 'text', text: `Results for: ${query}` }],
  structuredContent: { items: [] },
  _meta: {}
}));

// HTTP server
http.createServer(async (req, res) => {
  if (req.url === '/mcp') {
    // Handle MCP protocol
  }
}).listen(8787);
```

### Widget minimal

> **📚 Note** : Cet exemple est simplifié. Pour un widget robuste avec extraction de données, polling, et gestion d'erreurs, voir la section [Bonnes Pratiques : Développement de Widgets](#bonnes-pratiques--développement-de-widgets).

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>
  <script>
    const { toolOutput } = window.openai;
    const app = document.getElementById('app');

    if (toolOutput?.structuredContent) {
      app.innerHTML = JSON.stringify(toolOutput.structuredContent);
    }

    async function doAction() {
      const result = await window.openai.callTool('get_data', {
        query: 'test'
      });
      app.innerHTML = JSON.stringify(result.structuredContent);
    }
  </script>
</body>
</html>
```

---

## Bonnes Pratiques : Développement de Widgets

> **Contexte** : Cette section documente les leçons apprises lors du développement de widgets MCP, notamment lors du debug du widget `location.get_details` qui affichait "Données indisponibles" malgré la réception correcte des données par ChatGPT.

### 1. Extraction Robuste des Données (`extractData()`)

**Problème** : Le widget ne trouvait pas les données même si elles étaient présentes dans `toolOutput`.

**Cause** : La fonction `extractData()` n'était pas assez robuste et ne vérifiait pas toutes les sources possibles.

**Solution** : Implémenter une extraction multi-sources avec fallbacks :

```javascript
function extractData() {
  const sources = [
    () => window.openai?.toolOutput,
    () => window.oai?.toolOutput, // Pour compatibilité ou environnements spécifiques
  ];
  
  for (const getSource of sources) {
    try {
      let data = getSource();
      if (!data) continue;
      
      // Parser si string
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { continue; }
      }
      
      // PRIORITÉ 1 : Données directement à la racine (ex: { location: {...} })
      if (data?.location) {
        return data;
      }
      
      // PRIORITÉ 2 : Données dans structuredContent (ex: { structuredContent: { location: {...} } })
      if (data?.structuredContent?.location) {
        return {
          location: data.structuredContent.location,
          availableActions: data.structuredContent.availableActions || [],
          // ... autres propriétés
        };
      }
      
      // PRIORITÉ 3 : Données JSON parsées depuis un champ 'text' (ex: { text: "{ \"location\": {...} }" })
      if (data?.text) {
        try {
          const parsed = JSON.parse(data.text);
          if (parsed.location) return parsed;
        } catch(e) {}
      }
    } catch(e) {
      continue;
    }
  }
  
  return null;
}
```

**✅ Règle d'or** : Toujours tester l'extraction de données avec des `console.log` détaillés à chaque étape du processus de polling et d'initialisation.

### 2. Pattern d'Initialisation et de Rendu (`init()` / `render()`)

**Problème** : Appeler `render()` directement depuis la boucle de polling peut entraîner des rendus partiels ou des problèmes de synchronisation si les données ne sont pas entièrement prêtes ou si l'état n'est pas correctement géré.

**Solution** : Utiliser un pattern `init(data)` qui stocke les données reçues et appelle ensuite `render()`. `render()` doit toujours travailler avec l'état interne (`locationData`, `quarterData`, etc.) pour garantir la cohérence.

**Pattern Recommandé** :
```javascript
let widgetData = null; // Variable globale pour stocker les données

function render() {
  if (!widgetData) return;
  // Logique de rendu utilisant widgetData
  document.getElementById('root').innerHTML = `... ${widgetData.someProperty} ...`;
  // ... attacher les event listeners ici après le rendu ...
}

function init(data) {
  widgetData = data;
  render();
  // Initialiser les composants externes (ex: Leaflet map) ici
  if (widgetData.location?.latitude && widgetData.location?.longitude) {
    initMap(widgetData.location.latitude, widgetData.location.longitude);
  }
}
```

### 3. Condition de Polling et Nombre de Tentatives

**Problème** : Une condition de polling trop stricte (ex: attendre `data.location && data.availableActions`) peut empêcher le widget de se rendre même si les données principales sont là, car les actions peuvent être calculées ou ajoutées après. Un nombre insuffisant de tentatives peut aussi causer des échecs.

**Solution** :
- Simplifier la condition de polling pour vérifier uniquement la présence de la donnée principale (ex: `data?.location`). Les données secondaires peuvent être construites ou vérifiées dans `init()`/`render()`.
- Augmenter le nombre maximal de tentatives de polling (ex: 150 tentatives sur 15 secondes) pour les widgets complexes ou les environnements avec des latences.

**Pattern Recommandé** :
```javascript
let attempts = 0;
const maxAttempts = 150; // 15 secondes max (150 * 100ms)
const interval = setInterval(() => {
  attempts++;
  const data = extractData();

  if (data?.location) { // Condition simplifiée
    clearInterval(interval);
    init(data);
  } else if (attempts >= maxAttempts) {
    clearInterval(interval);
    document.getElementById('root').innerHTML = '<div class="error">Données indisponibles</div>';
  }
}, 100);
```

### 4. Gestion du `_meta` dans `http.ts` (Problème d'écrasement)

**Problème** : Lors de la construction du tableau `tools` dans `src/servers/http.ts`, le `_meta` spécifique à un outil (comme `location.get_details` qui pointe vers `location-details-widget.html`) peut être écrasé par un `_meta` par défaut appliqué à tous les outils.

**Solution** : Modifier la logique de mapping des outils pour vérifier si un `_meta` avec `outputTemplate` existe déjà pour un outil avant d'en appliquer un par défaut.

**Code Corrigé (extrait de `src/servers/http.ts`)** :
```typescript
const tools: Tool[] = allTools.map((tool) => {
  let toolMeta = {};
  if (tool._meta && 'openai/outputTemplate' in tool._meta) {
    toolMeta = tool._meta; // Utiliser le _meta existant
  } else {
    // Appliquer les métas par défaut uniquement si non déjà défini
    if (tool.name === 'weather.get_quarter') {
      toolMeta = quarterWidgetMeta();
    } else if (tool.name === 'weather.get_forecast') {
      toolMeta = widgetMeta();
    } else if (tool.name === 'location.get_details') {
      toolMeta = locationDetailsWidgetMeta();
    } else if (tool.name === 'location.get_medias') {
      toolMeta = locationMediasWidgetMeta();
    }
    // ... autres outils sans _meta par défaut ou avec meta conditionnel ...
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as Tool['inputSchema'],
    annotations: tool.annotations,
    ...((Object.keys(toolMeta).length > 0) ? { _meta: toolMeta } : {}),
  };
});
```

### Checklist de Développement de Widget

Lors de la création ou modification d'un widget, toujours vérifier :

- [ ] **Extraction des données** : `extractData()` gère-t-elle toutes les structures possibles de `toolOutput` ? (direct, `structuredContent`, `text` parsé)
- [ ] **Initialisation** : Le pattern `init(data)` qui stocke les données et appelle `render()` est-il utilisé ?
- [ ] **Rendu** : `render()` utilise-t-il l'état interne (`widgetData`) et est-il appelé après que toutes les données nécessaires sont prêtes ?
- [ ] **Polling** : La condition de polling est-elle simple (`data?.mainProperty`) et le nombre de tentatives suffisant (150) ?
- [ ] **`_meta`** : Le `_meta` du tool est-il correctement défini dans `http.ts` et n'est-il pas écrasé ?
- [ ] **Console Logs** : Des `console.log` détaillés sont-ils présents pour le debug du flux de données ?
- [ ] **Fallback** : Un message d'erreur clair est-il affiché si les données ne sont jamais reçues ?
- [ ] **Responsive** : Le widget s'adapte-t-il aux différentes tailles d'écran ?
- [ ] **Dark Mode** : Le style est-il correct en mode clair et sombre ?
- [ ] **Actions** : Les boutons d'action utilisent-ils `callTool()` avec un fallback `sendFollowUpMessage()` ?
- [ ] **Performance** : Le widget est-il léger et performant ? (CSS/JS inline, pas de grosses libs si non nécessaire)
- [ ] **Accessibilité** : Les éléments interactifs sont-ils accessibles ?

### Pièges Courants

1. **Ne pas vérifier toutes les sources** → Widget ne trouve pas les données
2. **Appeler `render()` directement depuis le polling** → Données perdues
3. **Condition de polling trop restrictive** → Polling s'arrête trop tôt
4. **Pas assez de tentatives** → Widget s'arrête avant réception des données
5. **`_meta` écrasé** → Widget ne se charge pas
6. **Ne pas logger** → Impossible de débugger

### Résumé des Règles d'Or

1. **Extraction multi-sources** : Toujours vérifier plusieurs sources et niveaux
2. **Pattern init/render** : Stocker les données avant de rendre
3. **Condition simple** : Vérifier uniquement la donnée principale
4. **Tentatives suffisantes** : 150 tentatives pour données complexes
5. **Préserver `_meta`** : Ne jamais écraser un `_meta` existant
6. **Logger pour débugger** : Toujours ajouter des logs lors du développement

---

## Ressources & Debugging

### Outils de dev
- **MCP Inspector**: `npx @modelcontextprotocol/inspector@latest <url>`
- **ngrok**: Tunnel local → HTTPS public
- **Browser DevTools**: Console pour errors CSP/JS

### Documentation officielle
- https://developers.openai.com/apps-sdk
- https://modelcontextprotocol.io/ (MCP spec)
- Usage Policies: Compliance obligatoire

### Exemples
- https://github.com/openai/chatgpt-apps-examples
- https://github.com/modelcontextprotocol/servers

---

## Aide-Mémoire Rapide

### Commandes essentielles
```bash
# Install
npm install @modelcontextprotocol/sdk zod

# Test local
npx @modelcontextprotocol/inspector@latest http://localhost:8787/mcp

# Tunnel dev
ngrok http 8787
```

### Checklist avant soumission
- [ ] Tests approfondis (pas beta/demo)
- [ ] Security review
- [ ] Metadata précises et transparentes
- [ ] Screenshots authentiques
- [ ] Data retention policy documentée
- [ ] Support contact maintenu
- [ ] Conformité usage policies OpenAI
- [ ] Accessibilité WCAG AA
- [ ] Performance optimisée (<200ms tool calls)
- [ ] **Annotations correctes** (`readOnlyHint`, `destructiveHint`, `openWorldHint`)

### Points critiques à retenir
- **`annotations: { readOnlyHint: true }`** obligatoire pour outils lecture seule
- MIME type `text/html+skybridge` obligatoire pour widgets
- `structuredContent` doit rester léger (<4k tokens)
- `_meta` jamais vu par le modèle (données riches uniquement)
- Valider TOUTES les entrées serveur (defense in depth)
- Read-only tools = safe to retry (+ annotation readOnlyHint)
- Write actions = confirmation utilisateur (+ destructiveHint/openWorldHint)
- OAuth 2.1 avec PKCE obligatoire pour auth
- HTTPS + Streamable HTTP support obligatoires en prod (SSE deprecated)
- Widget state scoped par instance (message_id/widgetId)
- `securitySchemes` par outil (pas au niveau serveur)

---

**Version**: Preview 2025
**Dernière mise à jour de ce document**: 2025-01-27
**Source**: https://developers.openai.com/apps-sdk
