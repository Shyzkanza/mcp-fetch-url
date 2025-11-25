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
- **`release/X.Y.Z`** : Branche de préparation de release (ne déclenche PAS de déploiement)

### Règles

1. ❌ **PAS de branche `develop`**
2. ❌ **PAS de commit direct sur `main`**
3. ✅ **TOUT le développement se fait sur `release/X.Y.Z`**
4. ✅ **Merge OBLIGATOIREMENT avec `--squash`**

---

## 🚀 Workflow de Release (OBLIGATOIRE)

### Étape 1 : Créer une Branche Release

```bash
# Depuis main
git checkout main
git pull origin main

# Créer la branche release (version suivante)
git checkout -b release/X.Y.Z
git push -u origin release/X.Y.Z
```

**Exemple** : Si `main` est en `1.0.0`, créer `release/1.0.1` pour les prochains développements

---

### Étape 2 : Développer sur la Release

```bash
# Travailler sur release/X.Y.Z
git checkout release/X.Y.Z

# Faire vos commits
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin release/X.Y.Z
```

**Points importants** :
- ✅ Commits multiples autorisés sur `release/X.Y.Z`
- ✅ Tests, corrections, itérations
- ❌ NE PAS merger dans `main` avant d'être prêt

---

### Étape 3 : Préparer la Release Finale

Avant de merger dans `main`, **OBLIGATOIREMENT** :

1. **Incrémenter la version** dans `package.json`
2. **Mettre à jour les versions** dans tous les fichiers source :
   - `src/http-server.ts`
   - `src/index.ts`
   - `src/http-client.ts`
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

### Étape 4 : Merger dans Main avec SQUASH

**⚠️ RÈGLE STRICTE : TOUJOURS `--squash`**

```bash
# Passer sur main
git checkout main
git pull origin main

# Merger avec squash (UN SEUL commit propre)
git merge --squash release/X.Y.Z

# Commit avec message structuré
git commit -m "chore: release X.Y.Z

- Feature 1: description
- Feature 2: description
- Fix: bug corrigé
- Update: MCP protocol version"

# Vérifier le commit
git log --oneline -1
```

**Pourquoi `--squash` ?**
- ✅ Historique propre sur `main` (un commit = une release)
- ✅ Changelog clair et lisible
- ✅ Facilite les reverts
- ✅ Respect de gitflow

---

### Étape 5 : Créer le Tag

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

### Étape 6 : Nettoyer les Branches

```bash
# Supprimer la branche release locale
git branch -d release/X.Y.Z

# Supprimer la branche release remote
git push origin --delete release/X.Y.Z
```

---

### Étape 7 : Créer la Prochaine Release

```bash
# Créer la branche pour la prochaine version
git checkout -b release/X.Y.Z+1
git push -u origin release/X.Y.Z+1
```

**Exemple** : Si vous venez de release `1.0.0`, créer `release/1.0.1`

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
- [ ] ✅ Merge avec `--squash`
- [ ] ✅ Tag créé au bon format (sans "v")
- [ ] ✅ Branches nettoyées
- [ ] ✅ Nouvelle branche release créée

---

## ❌ Erreurs à Éviter

### 1. Merge sans Squash

```bash
# ❌ INCORRECT
git merge release/1.0.0

# ✅ CORRECT
git merge --squash release/1.0.0
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
git checkout release/X.Y.Z
git commit -m "fix"
```

---

## 🔄 Récupération d'Erreur

### Si Vous Avez Mergé sans Squash

```bash
# Reset main au commit précédent
git reset --hard HEAD~1

# Refaire le merge avec squash
git merge --squash release/X.Y.Z
git commit -m "chore: release X.Y.Z"

# Force push
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
**Dernière mise à jour** : 2025-11-25

