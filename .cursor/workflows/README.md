# 📋 Workflows Cursor

Ce dossier contient les workflows automatisés pour le projet.

## 🎯 Workflows Disponibles

### 🔥 Priorité Haute

#### 1. `dev-complete` - Développement Complet
Démarre l'environnement de développement complet (serveur + tunnel + vérification).

**Utilisation** : `Cmd+Shift+P` → `dev-complete`

**Étapes** :
- Nettoie les processus existants
- Lance ngrok en arrière-plan
- Lance le serveur dev
- Vérifie la santé du serveur

---

#### 2. `release` - Processus de Release
Processus complet de release avec mise à jour de toutes les versions.

**Utilisation** : `Cmd+Shift+P` → `release`

**⚠️ Nécessite interaction** : L'IA demandera la version avant de commencer.

**Étapes** :
- Demande la version à l'utilisateur
- Vérifie la branche (doit être `develop`)
- Met à jour tous les fichiers de version
- Met à jour CONTEXT.md avec changelog
- Commit et push
- Guide pour créer la MR

---

#### 3. `validate-pre-release` - Validation Pré-Release
Vérifie que tout est prêt avant une release.

**Utilisation** : `Cmd+Shift+P` → `validate-pre-release`

**Étapes** :
- Vérifie la branche
- Vérifie les fichiers non commités
- Vérifie la cohérence des versions
- Vérifie README.md et CONTEXT.md
- Build et typecheck

---

### ⚡ Priorité Moyenne

#### 4. `build-and-test` - Build et Test
Build le projet et vérifie que tout fonctionne.

**Utilisation** : `Cmd+Shift+P` → `build-and-test`

**Étapes** :
- Clean
- Build
- Typecheck
- Démarre le serveur temporairement
- Health check
- Arrête le serveur

---

#### 5. `sync-post-release` - Synchronisation Post-Release
Synchronise `develop` avec `main` après une release.

**Utilisation** : `Cmd+Shift+P` → `sync-post-release`

**Prérequis** :
- La release a été mergée dans `main`
- Le tag a été créé
- On est sur `develop`

**Étapes** :
- Vérifie qu'on est sur `develop`
- Récupère `main`
- Merge `main` dans `develop` (normal, sans squash)
- Push `develop`

---

## 📝 Notes Importantes

### Workflows Interactifs

Certains workflows nécessitent une interaction avec l'utilisateur :
- **`release`** : Demande la version avant de commencer

### Workflows Automatiques

D'autres workflows sont entièrement automatiques :
- **`dev-complete`** : Démarre tout automatiquement
- **`validate-pre-release`** : Vérifie tout automatiquement
- **`build-and-test`** : Build et teste automatiquement
- **`sync-post-release`** : Synchronise automatiquement

### Format des Workflows

Les workflows sont des fichiers Markdown avec :
- **Métadonnées** : `description` dans le frontmatter
- **Étapes détaillées** : Instructions pour l'IA
- **Commandes bash** : Actions à exécuter

### Variables Disponibles

- `$WORKSPACE` : Chemin du workspace actuel

---

## 🔧 Maintenance

Pour ajouter un nouveau workflow :

1. Créer un fichier `.md` dans `.cursor/workflows/`
2. Ajouter les métadonnées dans le frontmatter
3. Documenter les étapes
4. Tester le workflow
5. Mettre à jour `WORKFLOWS_LIST.md`

---

## 📚 Documentation Complète

Voir `WORKFLOW.md` à la racine du projet pour le schéma visuel du workflow Git et les étapes détaillées du processus de release.

