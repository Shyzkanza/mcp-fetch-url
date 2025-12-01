# 🛠️ Commandes - MCP Fetch URL (Scrapidou)

Guide complet des commandes npm et Cursor disponibles pour le développement.

---

## 📦 Commandes npm

### Développement

| Commande | Description |
|----------|-------------|
| `npm run dev` | 🌟 **Recommandé** - Lance le serveur dev avec hot-reload. **Kill auto** le process existant. |
| `npm run dev:http` | Alias pour `dev` |
| `npm run dev:tunnel` | Lance dev + ngrok en parallèle |

### Build

| Commande | Description |
|----------|-------------|
| `npm run build` | Compile TypeScript vers `dist/` |
| `npm run typecheck` | Vérifie les types sans compiler |
| `npm run clean` | Supprime le dossier `dist/` |
| `npm run rebuild` | Clean + Build |

### Production

| Commande | Description |
|----------|-------------|
| `npm run start` | Lance le serveur HTTP compilé |
| `npm run start:http` | Alias pour `start` |
| `npm run build:start` | Build puis start |

### Utilitaires

| Commande | Description |
|----------|-------------|
| `npm run kill` | Kill le process sur le port (défaut: 3000) |
| `npm run kill:tunnel` | Kill tous les processus ngrok |
| `npm run tunnel` | Lance ngrok seul |
| `npm run inspect` | Lance MCP Inspector |
| `npm run health` | Appelle `/health` |

---

## 🎯 Commandes Cursor

Accessibles via **Cmd+Shift+P** dans Cursor.

| Commande | Description |
|----------|-------------|
| `dev-server` | 🌟 Lance le serveur dev |
| `tunnel-only` | 🌟 Lance ngrok seul |
| `dev-with-tunnel` | Dev + ngrok ensemble |
| `build` | Compile TypeScript |
| `build-and-start` | Build puis start |
| `clean` | Supprime `dist/` |
| `rebuild` | Clean + Build |
| `kill-server` | Kill le process |
| `kill-tunnel` | Kill ngrok |
| `mcp-inspector` | Ouvre MCP Inspector |
| `health-check` | Vérifie le health |
| `install-deps` | npm install |

---

## 🚀 Workflows Recommandés

### Workflow 1 : Développement avec ChatGPT

```bash
# Terminal 1 - Tunnel ngrok
npm run tunnel

# Terminal 2 - Serveur dev
npm run dev
```

Via Cursor :
- **Cmd+Shift+P** → `tunnel-only`
- **Cmd+Shift+P** → `dev-server`

### Workflow 2 : Développement local

```bash
# Terminal 1 - Serveur
npm run dev

# Terminal 2 - MCP Inspector
npm run inspect
```

---

## 🔧 Variables d'Environnement

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

---

## 📝 Prérequis

- **Node.js** >= 20.0.0
- **ngrok** installé globalement
- **jq** pour `health` (optionnel)

---

## 🔗 Liens Utiles

- [README.md](./README.md)
- [OPENAI_APPS_SDK_REFERENCE.md](./OPENAI_APPS_SDK_REFERENCE.md)
- [CONTEXT.md](./CONTEXT.md)

