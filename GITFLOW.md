# 🔄 Gitflow Workflow - Scrapidou MCP

**⚠️ RÈGLES STRICTES À RESPECTER POUR TOUS LES PROJETS MCP**

---

## 📋 Configuration Git Obligatoire

Avant tout commit, **TOUJOURS** vérifier :

```bash
git config user.name "Jessy Bonnotte"
git config user.email "jessy.bonnotte@gmail.com"
```

❌ **NE JAMAIS** commit avec `jessy.bonnotte@insideapp.fr`  
✅ **TOUJOURS** utiliser `jessy.bonnotte@gmail.com`

---

## 🌳 Structure des Branches

### Branches Principales

- **`main`** : Production (protégée, déploiement automatique)
- **`develop`** : Développement (branche de développement continue)

### Règles

1. ✅ **Branche `develop` pour tout le développement**
2. ❌ **PAS de commit direct sur `main`**
3. ✅ **TOUT le développement se fait sur `develop`**
4. ✅ **Merge normal de `develop` vers `main` (sans `--squash`)**
5. ✅ **Après release : merge `main` vers `develop` pour synchroniser**

---

## 🚀 Workflow de Développement (OBLIGATOIRE)

### Étape 1 : Développer sur Develop

```bash
# Travailler sur develop
git checkout develop
git pull origin develop

# Faire vos commits
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin develop
```

**Points importants** :
- ✅ Commits multiples autorisés sur `develop`
- ✅ Tests, corrections, itérations
- ✅ Branche `develop` est la branche de développement continue

---

## 🚀 Workflow de Release (OBLIGATOIRE)

### Étape 1 : Préparer la Release Finale

Avant de merger dans `main`, **OBLIGATOIREMENT** :

1. **Incrémenter la version** dans `package.json`
2. **Mettre à jour les versions** dans tous les fichiers source :
   - `src/servers/http.ts`
   - `src/http-client.ts`
   - `src/servers/stdio.ts`
   - Tout autre fichier contenant une version

3. **Mettre à jour la documentation** :
   - Date dans `CONTEXT.md`
   - Changelog dans `CONTEXT.md`
   - README si nécessaire

4. **Build et test final** :
   ```bash
   npm run build
   npm test  # si tests présents
   ```

---

### Étape 2 : Merger Develop dans Main

**⚠️ RÈGLE : Merge normal (sans `--squash`)**

```bash
# Passer sur main
git checkout main
git pull origin main

# Merger develop dans main (merge normal)
git merge develop -m "chore: release X.Y.Z

- Feature 1: description
- Feature 2: description
- Fix: bug corrigé
- Update: MCP protocol version"

# Vérifier le commit
git log --oneline -1
```

**Note** : On utilise un merge normal (pas de `--squash`) pour préserver l'historique complet des commits de développement.

---

### Étape 3 : Créer le Tag

**Format STRICT : `X.Y.Z` (SANS "v")**

```bash
# Récupérer la version depuis package.json
VERSION=$(node -p "require('./package.json').version")

# Créer le tag
git tag -a "$VERSION" -m "Release $VERSION"

# Push main + tags
git push origin main
git push origin --tags
```

**Exemples** :
- ✅ `1.0.0` (correct)
- ❌ `v1.0.0` (incorrect)

Le tag doit **EXACTEMENT** correspondre à la version dans `package.json`.

---

### Étape 4 : Mettre à Jour Develop

**⚠️ IMPORTANT : Après chaque release, mettre à jour `develop` avec `main`**

```bash
# Retourner sur develop
git checkout develop

# Merger main dans develop pour synchroniser
git merge main

# Push develop
git push origin develop
```

**Pourquoi ?**
- ✅ `develop` reste synchronisée avec `main`
- ✅ Les nouvelles features partent de la dernière release
- ✅ Évite les conflits futurs

---

## 🏷️ Convention de Tags

### Format

```
MAJOR.MINOR.PATCH
```

**Exemples valides** :
- `1.0.0` - Release initiale
- `1.0.1` - Correctif (patch)
- `1.1.0` - Nouvelle fonctionnalité (minor)
- `2.0.0` - Breaking change (major)

### Quand Incrémenter ?

- **PATCH** (X.Y.Z) : Corrections de bugs, petites améliorations
- **MINOR** (X.Y.0) : Nouvelles fonctionnalités sans breaking changes
- **MAJOR** (X.0.0) : Breaking changes, refonte majeure

---

## 📝 Checklist Avant Release

Avant de merger dans `main`, vérifier :

- [ ] ✅ Version incrémentée dans `package.json`
- [ ] ✅ Versions mises à jour dans tous les fichiers source
- [ ] ✅ `CONTEXT.md` mis à jour (date, changelog)
- [ ] ✅ Build réussit (`npm run build`)
- [ ] ✅ Tests passent (si présents)
- [ ] ✅ Commits utilisent `jessy.bonnotte@gmail.com`
- [ ] ✅ Merge normal (sans `--squash`)
- [ ] ✅ Tag créé au bon format (sans "v")
- [ ] ✅ `develop` mis à jour avec `main` après release

---

## ❌ Erreurs à Éviter

### 1. Merge avec Squash (OBSOLÈTE)

```bash
# ❌ OBSOLÈTE (ne plus utiliser)
git merge --squash develop

# ✅ CORRECT (merge normal)
git merge develop
```

### 2. Tag avec "v"

```bash
# ❌ INCORRECT
git tag -a v1.0.0

# ✅ CORRECT
git tag -a 1.0.0
```

### 3. Mauvais Email

```bash
# ❌ INCORRECT
git config user.email "jessy.bonnotte@insideapp.fr"

# ✅ CORRECT
git config user.email "jessy.bonnotte@gmail.com"
```

### 4. Commit Direct sur Main

```bash
# ❌ INCORRECT
git checkout main
git commit -m "fix"

# ✅ CORRECT
git checkout develop
git commit -m "fix"
```

### 5. Oublier de Mettre à Jour Develop

```bash
# ❌ INCORRECT
# Après release, continuer sur develop sans merger main

# ✅ CORRECT
# Après release, merger main dans develop
git checkout develop
git merge main
git push origin develop
```

---

## 🔄 Récupération d'Erreur

### Si Vous Avez Besoin de Revenir en Arrière

```bash
# Reset main au commit précédent
git reset --hard HEAD~1

# Refaire le merge normal
git merge develop -m "chore: release X.Y.Z"

# Force push (seulement si nécessaire)
git push -f origin main
```

### Si Vous Avez Utilisé le Mauvais Email

```bash
# Corriger l'auteur du dernier commit
git commit --amend --author="Jessy Bonnotte <jessy.bonnotte@gmail.com>" --no-edit

# Si déjà push
git push -f origin branch-name
```

---

## 📚 Ressources

- [Semantic Versioning](https://semver.org/)
- [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Maintenu par** : Jessy Bonnotte  
**Dernière mise à jour** : 2025-01-27
