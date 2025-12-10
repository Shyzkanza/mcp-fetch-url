---
description: 🚀 Démarre l'environnement de développement complet (serveur + tunnel + vérification)
---

# Workflow de Développement Complet

Démarre l'environnement de développement complet pour tester avec ChatGPT.

## Étapes

1. **Nettoyer les processus existants**
   ```bash
   cd $WORKSPACE && npm run kill
   cd $WORKSPACE && npm run kill:tunnel
   ```

2. **Lancer le tunnel ngrok** (en arrière-plan)
   ```bash
   cd $WORKSPACE && npm run tunnel &
   ```
   ⚠️ **Note** : Le tunnel ngrok doit rester actif. L'URL reste la même tant que le processus tourne.

3. **Attendre 2 secondes** pour que ngrok démarre
   ```bash
   sleep 2
   ```

4. **Lancer le serveur de développement**
   ```bash
   cd $WORKSPACE && npm run dev
   ```

5. **Vérifier la santé du serveur** (après quelques secondes)
   ```bash
   cd $WORKSPACE && npm run health
   ```

## Utilisation

- **Via Cursor** : `Cmd+Shift+P` → `dev-complete`
- **Commande manuelle** : Utiliser les commandes individuelles dans l'ordre

## Notes

- Le tunnel ngrok tourne en arrière-plan
- Le serveur dev tourne en premier plan avec hot-reload
- L'URL ngrok reste stable tant que le processus tourne
- Pour arrêter : `Cmd+C` puis `kill-tunnel`

