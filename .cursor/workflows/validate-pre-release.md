---
description: ✅ Vérifie que tout est prêt avant une release
---

# Workflow de Validation Pré-Release

Vérifie que le projet est prêt pour une release (versions, build, branches, etc.).

## Étapes

1. **Vérifier la branche**
   ```bash
   cd $WORKSPACE && git branch --show-current
   ```
   ⚠️ **Doit être sur `develop`**

2. **Vérifier les fichiers non commités**
   ```bash
   cd $WORKSPACE && git status --porcelain
   ```
   ⚠️ **Avertir si des fichiers non commités existent**

3. **Vérifier la cohérence des versions**
   ```bash
   cd $WORKSPACE
   VERSION=$(node -p "require('./package.json').version")
   echo "Version dans package.json: $VERSION"
   grep -r "version.*'$VERSION'" src/ || echo "⚠️ Vérifier les versions dans src/"
   ```

4. **Vérifier le badge version dans README.md**
   ```bash
   cd $WORKSPACE
   VERSION=$(node -p "require('./package.json').version")
   grep "v$VERSION" README.md || echo "⚠️ Badge version dans README.md n'est pas à jour"
   ```

5. **Vérifier CONTEXT.md**
   ```bash
   cd $WORKSPACE
   VERSION=$(node -p "require('./package.json').version")
   grep "### v$VERSION" CONTEXT.md || echo "⚠️ Changelog pour v$VERSION manquant dans CONTEXT.md"
   ```

6. **Build le projet**
   ```bash
   cd $WORKSPACE && npm run build
   ```

7. **Vérifier les types TypeScript**
   ```bash
   cd $WORKSPACE && npm run typecheck
   ```

8. **Résumé des vérifications**
   ```bash
   echo "✅ Validation pré-release terminée"
   echo "📋 Vérifications effectuées :"
   echo "  - Branche: $(git branch --show-current)"
   echo "  - Version: $(node -p "require('./package.json').version")"
   echo "  - Build: OK"
   echo "  - Types: OK"
   ```

## Utilisation

- **Via Cursor** : `Cmd+Shift+P` → `validate-pre-release`
- **Avant une release** : Exécuter ce workflow pour s'assurer que tout est prêt

## Notes

- Ce workflow ne modifie rien, il vérifie seulement
- Tous les avertissements doivent être résolus avant de créer la MR
- Le workflow s'arrête si une vérification échoue

