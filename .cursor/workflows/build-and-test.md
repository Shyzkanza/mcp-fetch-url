---
description: 🔨 Build le projet et vérifie que tout fonctionne
---

# Workflow de Build et Test

Build le projet et vérifie que tout fonctionne correctement.

## Étapes

1. **Nettoyer le build précédent**
   ```bash
   cd $WORKSPACE && npm run clean
   ```

2. **Build le projet**
   ```bash
   cd $WORKSPACE && npm run build
   ```

3. **Vérifier les types TypeScript**
   ```bash
   cd $WORKSPACE && npm run typecheck
   ```

4. **Démarrer le serveur** (en arrière-plan)
   ```bash
   cd $WORKSPACE && npm run start &
   ```

5. **Attendre que le serveur démarre**
   ```bash
   sleep 3
   ```

6. **Vérifier la santé du serveur**
   ```bash
   cd $WORKSPACE && npm run health
   ```

7. **Arrêter le serveur**
   ```bash
   cd $WORKSPACE && npm run kill
   ```

8. **Résumé**
   ```bash
   echo "✅ Build et test terminés avec succès"
   ```

## Utilisation

- **Via Cursor** : `Cmd+Shift+P` → `build-and-test`
- **Avant un commit** : Vérifier que le build passe

## Notes

- Le serveur démarre temporairement pour vérifier qu'il fonctionne
- Le serveur est automatiquement arrêté à la fin
- Si une étape échoue, le workflow s'arrête

