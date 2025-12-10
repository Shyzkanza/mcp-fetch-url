---
description: 📦 Processus complet de release avec mise à jour de toutes les versions
---

# Workflow de Release

Processus complet pour créer une release : mise à jour des versions, commit, création de MR.

## ⚠️ IMPORTANT

Ce workflow **nécessite une interaction avec l'utilisateur** pour demander la version. L'IA doit suivre les étapes ci-dessous.

## Étapes

### 1. Demander la Version

**L'IA DOIT demander** :
```
"Quelle version voulez-vous faire ? 2.1.0 ?"
```

**Attendre la confirmation** de l'utilisateur avant de continuer.

### 2. Vérifier la Branche

```bash
cd $WORKSPACE
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "develop" ]; then
  echo "⚠️ Vous devez être sur la branche develop"
  echo "Branche actuelle: $BRANCH"
  exit 1
fi
```

### 3. Mettre à Jour package.json

**L'IA doit modifier** `package.json` :
```json
{
  "version": "X.Y.Z"  // Remplacer par la version demandée
}
```

### 4. Mettre à Jour src/servers/http.ts

**L'IA doit rechercher et remplacer** toutes les occurrences de `version: 'X.Y.Z'` :
- Dans `createMcpServer()` : `server.version = 'X.Y.Z';`
- Dans `/health` endpoint : `version: 'X.Y.Z',`

### 5. Mettre à Jour src/http-client.ts

**L'IA doit vérifier et mettre à jour** (si présent) :
```typescript
version: 'X.Y.Z',
```

### 6. Mettre à Jour src/servers/stdio.ts

**L'IA doit vérifier et mettre à jour** (si présent) :
```typescript
version: 'X.Y.Z',
```

### 7. Mettre à Jour README.md

**L'IA doit mettre à jour le badge version** (ligne 6 pour mcp-fetch-url) :
```markdown
[![npm version](https://img.shields.io/badge/npm-vX.Y.Z-blue)](https://www.npmjs.com/package/@shyzus/mcp-scrapidou)
```

### 8. Mettre à Jour CONTEXT.md

**L'IA doit ajouter une entrée changelog** :
```markdown
## 📝 Change History

### vX.Y.Z - YYYY-MM-DD (Titre court)

**Release Notes**
- ✅ Feature 1: description
- ✅ Feature 2: description
- ✅ Fix: bug corrigé
- ✅ Update: changement

**Git**
- Commit: (sera complété après commit)
- Tag: `X.Y.Z`
- Branch: `main` (merged from develop)
```

### 9. Vérifier la Cohérence

```bash
cd $WORKSPACE
VERSION=$(node -p "require('./package.json').version")
echo "Version dans package.json: $VERSION"
echo "Vérification des versions dans src/..."
grep -r "version.*'$VERSION'" src/ || echo "⚠️ Vérifier les versions dans src/"
echo "Vérification du badge dans README.md..."
grep "v$VERSION" README.md || echo "⚠️ Badge version dans README.md n'est pas à jour"
echo "Vérification du changelog dans CONTEXT.md..."
grep "### v$VERSION" CONTEXT.md || echo "⚠️ Changelog pour v$VERSION manquant dans CONTEXT.md"
```

### 10. Commit les Changements

```bash
cd $WORKSPACE
VERSION=$(node -p "require('./package.json').version")
git add package.json src/**/*.ts README.md CONTEXT.md
git commit -m "chore: bump version to $VERSION

- Update version in package.json
- Update version in src/servers/http.ts
- Update version in src/http-client.ts
- Update version in src/servers/stdio.ts
- Update README.md badge version
- Update CONTEXT.md changelog"
```

### 11. Push et Créer la MR

```bash
cd $WORKSPACE
VERSION=$(node -p "require('./package.json').version")
git push origin develop
echo "✅ Changements pushés sur develop"
echo "📝 Créer une MR avec le titre : 'Release $VERSION'"
```

## Utilisation

- **Via Cursor** : `Cmd+Shift+P` → `release`
- **L'IA doit suivre** toutes les étapes ci-dessus
- **L'utilisateur doit** créer la MR manuellement sur GitHub/GitLab

## Notes

- ⚠️ **Toujours demander la version** avant de commencer
- ⚠️ **Vérifier tous les fichiers** avant de commit
- ⚠️ **Titre MR = "Release X.Y.Z"** (format strict)
- ⚠️ **Tag = X.Y.Z** (sans "v", sera créé après merge)

## Après Validation de la MR

Une fois la MR validée et mergée dans `main` :

1. Checkout main
2. Merge develop **avec SQUASH** : `git merge --squash develop` puis commit
3. Créer tag `X.Y.Z`
4. Push main + tag
5. Utiliser le workflow `sync-post-release` pour synchroniser develop (merge normal, SANS squash)

