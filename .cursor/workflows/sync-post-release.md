---
description: 🔄 Synchronise develop avec main après une release
---

# Workflow de Synchronisation Post-Release

Synchronise la branche `develop` avec `main` après qu'une release a été mergée.

## Prérequis

- ✅ La release a été mergée dans `main`
- ✅ Le tag a été créé et pushé
- ✅ On est sur la branche `develop`

## Étapes

1. **Vérifier qu'on est sur develop**
   ```bash
   cd $WORKSPACE
   BRANCH=$(git branch --show-current)
   if [ "$BRANCH" != "develop" ]; then
     echo "⚠️ Vous devez être sur la branche develop"
     echo "Branche actuelle: $BRANCH"
     exit 1
   fi
   ```

2. **Récupérer les dernières modifications**
   ```bash
   cd $WORKSPACE && git fetch origin
   ```

3. **Merger main dans develop** (merge normal, sans squash)
   ```bash
   cd $WORKSPACE && git merge origin/main -m "chore: sync develop with main after release"
   ```

4. **Push develop**
   ```bash
   cd $WORKSPACE && git push origin develop
   ```

5. **Résumé**
   ```bash
   echo "✅ Develop synchronisé avec main"
   echo "📋 Dernier commit: $(git log --oneline -1)"
   ```

## Utilisation

- **Via Cursor** : `Cmd+Shift+P` → `sync-post-release`
- **Après une release** : Exécuter ce workflow pour synchroniser

## Notes

- ⚠️ **Ne pas utiliser `--squash`** : On veut préserver l'historique
- Si des conflits apparaissent, les résoudre manuellement
- Le workflow vérifie qu'on est bien sur `develop` avant de continuer

