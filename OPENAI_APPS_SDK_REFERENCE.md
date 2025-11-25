# OpenAI Apps SDK - Guide de Référence

> Documentation synthétique du SDK OpenAI Apps pour ChatGPT (Preview 2025)
> Source: https://developers.openai.com/apps-sdk

## Vue d'ensemble

Le **Apps SDK** est un framework pour construire des applications intégrées dans ChatGPT. Il combine:
- Un **serveur MCP** (Model Context Protocol) qui expose des outils/capacités
- Des **composants UI** (widgets HTML) rendus dans ChatGPT
- Le **modèle AI** qui décide quand invoquer les outils

**Statut**: Preview - les soumissions d'apps ouvriront plus tard en 2025.

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

### Architecture de base

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

---

## Serveur MCP - Configuration

### 1. Registrer un template (composant UI)

```javascript
server.registerResource({
  uri: 'template://my-widget',
  name: 'My Widget Template',
  mimeType: 'text/html+skybridge', // CRUCIAL - active le runtime widget
  text: async () => fs.readFileSync('./public/widget.html', 'utf-8')
});
```

**Important**: Le MIME type `text/html+skybridge` signale à ChatGPT de traiter le HTML comme un widget avec injection du runtime.

### 2. Registrer un outil

```javascript
server.registerTool({
  name: 'my_tool',
  title: 'Mon Outil Lisible', // Visible par l'utilisateur
  description: 'Use this when the user wants to...',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  },
  annotations: {
    readOnlyHint: true,      // Signal outil read-only (skip confirmation)
    destructiveHint: false,  // Si true, peut supprimer/écraser données
    openWorldHint: false     // Si true, publie du contenu hors compte user
  },
  _meta: {
    'openai/outputTemplate': 'template://my-widget' // Lie l'outil au widget
  }
}, async (params) => {
  // Logique métier
  return {
    content: [{
      type: 'text',
      text: 'Résultat en markdown pour le modèle'
    }],
    structuredContent: {
      // JSON concis pour widget ET modèle
      items: [...]
    },
    _meta: {
      // Données riches/sensibles UNIQUEMENT pour le widget
      // Jamais vu par le modèle
      detailedData: {...}
    }
  };
});
```

### 3. Serveur HTTP avec endpoint /mcp

```javascript
const server = http.createServer(async (req, res) => {
  if (req.url === '/mcp') {
    // Support POST, GET, DELETE
    // Headers CORS requis
    // Support Server-Sent Events (streaming)
  }
});

server.listen(8787);
```

---

## Widget UI - Développement

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
| `widgetState` | État persisté du widget |
| `displayMode` | Mode d'affichage: inline/carousel/fullscreen/pip |
| `maxHeight` | Hauteur max disponible (pour responsive) |
| `callTool(name, payload)` | Invoque un outil serveur |
| `setWidgetState(state)` | Persiste l'état du widget |
| `sendFollowUpMessage(text)` | Envoie un message dans ChatGPT |

### Restrictions du Sandbox

- ❌ Pas d'accès `alert()`, `confirm()`, `prompt()`
- ❌ Pas d'accès clipboard direct
- ❌ CSP strict - pas de scripts externes
- ✅ Tous les assets doivent être inline (CSS, JS, images en base64)

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
    // Données RICHES/SENSIBLES uniquement pour widget
    // JAMAIS vu par le modèle
    'openai/outputTemplate': 'template://my-widget',
    fullDetails: {...},
    credentials: {...} // Si nécessaire (déconseillé)
  }
}
```

**Règle d'or**: Garder `structuredContent` léger. "Oversized payloads degrade model performance."

---

## Modes d'Affichage

| Mode | Usage | Caractéristiques |
|------|-------|------------------|
| **Inline** | Cartes légères dans la conversation | 1 action claire, données simples |
| **Carousel** | Comparaison d'items similaires | 3-8 items optimaux, swipe horizontal |
| **Fullscreen** | Expériences riches | Composer ChatGPT reste accessible |
| **Picture-in-Picture** | Activités parallèles | Fenêtre flottante (jeux, collab) |

Détecter le mode: `window.openai.displayMode`

---

## Développement Local

### 1. Lancer le serveur

```bash
node server.js
# Todo MCP server listening on http://localhost:8787/mcp
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

1. Activer le mode développeur dans Settings
2. Créer un connecteur avec l'URL `/mcp` publique
3. Ajouter le connecteur au chat
4. **Rafraîchir le connecteur après chaque modification du serveur**

---

## Design Guidelines - Principes

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

### Design visuel

- **Couleurs**: Utiliser les palettes système, accents de marque uniquement sur boutons/badges
- **Typographie**: Hériter les polices natives (SF Pro/Roboto)
- **Spacing**: Respecter les espacements système
- **Accessibilité**: Alt text obligatoire, contraste WCAG AA minimum

---

## Sécurité & Confidentialité

### Principes fondamentaux

1. **Least Privilege** - Demander uniquement les permissions nécessaires
2. **Explicit User Consent** - Utilisateur comprend les implications (linking, write access)
3. **Defense in Depth** - Assumer que prompt injection arrivera

### Data handling

- ✅ Collecter uniquement les données nécessaires à la tâche actuelle
- ❌ Pas d'identifiants gouvernementaux, cartes bancaires, mots de passe, clés API
- ✅ Politique de rétention documentée + support de suppression
- ✅ Retirer PII des logs (garder correlation IDs pour debug)

### Protection contre prompt injection

- Valider TOUTES les entrées côté serveur (ignorer les valeurs du modèle)
- Exiger confirmation humaine pour actions irréversibles
- Revoir régulièrement les descriptions d'outils pour décourager mauvais usage

### Authentication

- OAuth 2.1 avec PKCE et dynamic client registration
- Vérifier scopes à chaque invocation d'outil
- Rejeter tokens expirés/malformés avec erreurs appropriées
- Éviter secrets long-terme

### Actions d'écriture vs Lecture seule

**Outils Read-Only** (consultation uniquement):
- Ajouter `annotations: { readOnlyHint: true }` au tool descriptor
- ChatGPT skip les prompts "Are you sure?"
- Doivent être side-effect-free et safe to retry
- Exemples: recherche, consultation horaires, calcul itinéraires

**Outils Write/Destructive** (modification de données):
- `annotations: { destructiveHint: true }` si suppression/écrasement
- `annotations: { openWorldHint: true }` si publication publique
- Avoir des labels clairs (create/modify/delete)
- Inclure confirmation utilisateur explicite

### Sandbox & CSP

- Widgets en iframe sandboxed avec CSP strict
- APIs navigateur bloquées (alerts, clipboard)
- Pas de scripts externes autorisés
- Déclarer domaines CSP dans metadata des outils

---

## Guidelines de Qualité

### Requirements de soumission

**Purpose & Quality**
- Valeur claire et fonctionnement fiable
- ❌ Pas de designs trompeurs, copycats, impersonation, spam
- ❌ Pas de versions beta/demo
- ✅ Tests approfondis avant lancement

**Metadata**
- Noms et descriptions transparents et précis
- Screenshots authentiques (fonctionnalité réelle)
- Titres d'outils clairs sur read-only vs write

**Safety**
- Conformité aux usage policies OpenAI
- Apps non-conformes retirées même si approuvées avant
- Audiences 13+ (mature 18+ nécessitera vérification d'âge)
- ❌ Pas de ciblage <13 ans

**Privacy**
- Minimisation des données ("essential only")
- Labels clairs sur write actions
- ❌ Pas de surveillance/tracking comportemental sans disclosure
- Read-only tools doivent être safe to retry

**Fair Competition**
- Ne pas décourager compétiteurs
- Mettre en avant sa valeur sans dénigrer alternatives

**Developer Accountability**
- Identité vérifiée
- Contact support client maintenu
- Re-review nécessaire lors d'ajouts/modifications d'outils
- Retrait possible pour inactivité/instabilité/violations

---

## Métadonnées des Outils - Best Practices

### Description efficace

```javascript
{
  name: 'book_flight',
  title: 'Book a Flight',
  description: 'Use this when the user wants to book a flight. ' +
               'Requires departure city, destination, and date. ' +
               'Do NOT use for flight search or price comparison.',
  // ...
}
```

**Pattern "Use this when..."** aide le modèle à choisir le bon outil.

### Schema précis

Le modèle lit le schema pour décider si l'outil correspond.
"Treat names, descriptions, and schemas as part of your UX."

### Output template

```javascript
_meta: {
  'openai/outputTemplate': 'template://booking-widget',
  'openai/cspDomains': ['api.example.com'] // Si widget fait des fetch
}
```

---

## Troubleshooting Commun

### Outils n'apparaissent pas
- ✅ Vérifier serveur opérationnel sur `/mcp`
- ✅ Rafraîchir connecteur dans ChatGPT après modifications
- ✅ Tester avec MCP Inspector

### Composants ne chargent pas
- ✅ Vérifier console navigateur pour violations CSP
- ✅ Confirmer `mimeType: 'text/html+skybridge'`
- ✅ Vérifier `_meta['openai/outputTemplate']` présent dans response

### État ne persiste pas
- ✅ Appeler `window.openai.setWidgetState()` après updates
- ✅ Rehydrater depuis `window.openai.widgetState` à l'init

### Performances sluggish
- ✅ Garder tool calls <200ms
- ✅ Réduire taille de `structuredContent`
- ✅ Mettre données lourdes dans `_meta` (pas vu par modèle)

### Layout mobile cassé
- ✅ Référencer `window.openai.maxHeight`
- ✅ Éviter hauteurs fixes
- ✅ Tester en modes inline/carousel/fullscreen

### Mauvaise découverte d'outil
- ✅ Améliorer descriptions avec "Use this when..."
- ✅ Clarifier différences avec outils similaires
- ✅ Tester avec prompts primaires

### Erreurs auth (401)
- ✅ Inclure header `WWW-Authenticate` dans erreurs
- ✅ Vérifier issuer URLs et audience claims
- ✅ Confirmer `registration_endpoint` exposé

---

## Déploiement Production

### Options de hosting

**Containers managés** (recommandé pour démarrage rapide)
- Fly.io, Render, Railway
- TLS automatique

**Serverless**
- Google Cloud Run, Azure Container Apps
- Scaling automatique

**Kubernetes**
- Pour clusters existants
- Ingress controllers doivent supporter Server-Sent Events

### Requirements critiques

- ✅ HTTPS obligatoire
- ✅ Endpoint `/mcp` responsive
- ✅ Support streaming (SSE - Server-Sent Events)
- ✅ HTTP status codes appropriés
- ✅ Pas de buffering par load balancer (casse SSE)

### Pre-launch checklist

- [ ] Restreindre accès (dev mode / feature flags)
- [ ] Tester avec prompts de découverte prévus
- [ ] Documenter exemples visuels du composant
- [ ] Secrets dans gestionnaires de secrets (pas repos)
- [ ] Logging des tool calls et latency
- [ ] Monitoring resource usage pour scaling

### Workflow de déploiement

1. Rebuild component bundle après changements
2. Restart MCP server
3. Refresh connector settings dans ChatGPT
4. Test avec prompts réels

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

### Serveur MCP minimal

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
    properties: { query: { type: 'string' } }
  },
  annotations: {
    readOnlyHint: true  // ← Lecture seule, pas de confirmation
  },
  _meta: { 'openai/outputTemplate': 'template://widget' }
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

## Ressources & Debugging

### Outils de dev
- **MCP Inspector**: `npx @modelcontextprotocol/inspector@latest <url>`
- **ngrok**: Tunnel local → HTTPS public
- **Browser DevTools**: Console pour errors CSP/JS

### Logs à collecter pour support
- Server logs (stdout/stderr)
- Component console output
- Tool call transcripts
- Screenshots
- Prompt exact utilisé

### Documentation officielle
- https://developers.openai.com/apps-sdk
- Usage Policies: Compliance obligatoire

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
- `structuredContent` doit rester léger
- `_meta` jamais vu par le modèle (données riches uniquement)
- Valider TOUTES les entrées serveur (defense in depth)
- Read-only tools = safe to retry (+ annotation readOnlyHint)
- Write actions = confirmation utilisateur (+ destructiveHint/openWorldHint)
- OAuth 2.1 avec PKCE
- HTTPS + SSE support obligatoires en prod

---

**Version**: Preview 2025
**Dernière mise à jour de ce document**: 2025-11-15

