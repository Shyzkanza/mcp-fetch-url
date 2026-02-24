# 🗺️ Cartographie Exhaustive - Utilisation de l'IA dans le Projet

**Dernière mise à jour** : 2025-01-27  
**Version** : 2.0.1

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du Système de Règles](#architecture-du-système-de-règles)
3. [Types de Règles et leur Priorité](#types-de-règles-et-leur-priorité)
4. [User Rules - Règles Personnalisées de l'Utilisateur](#-user-rules---règles-personnalisées-de-lutilisateur)
5. [Règles Cursor (`.cursor/rules/`)](#règles-cursor-cursorrules)
6. [Règles de Projet (`.cursor/rules/`)](#-règles-de-projet-cursorrules)
7. [Workflows Cursor (`.cursor/workflows/`)](#workflows-cursor-cursorworkflows)
8. [Commandes Cursor (`.cursor/commands/`)](#commandes-cursor-cursorcommands)
9. [CONTEXT.md - La Mémoire du Projet](#contextmd---la-mémoire-du-projet)
10. [Memories - Connaissances Persistantes](#memories---connaissances-persistantes)
11. [Ordre de Priorité et Application](#ordre-de-priorité-et-application)
12. [Flux de Traitement d'une Requête](#flux-de-traitement-dune-requête)
13. [Exemples Concrets](#exemples-concrets)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que ce document ?

Ce document explique **comment l'IA (Claude/Cursor) utilise et interagit avec tous les éléments de configuration du projet** pour comprendre le contexte, appliquer les bonnes pratiques, et exécuter les tâches correctement.

### Écosystème Complet

```
┌─────────────────────────────────────────────────────────┐
│  Requête Utilisateur                                     │
│  "Faire une release 2.1.0"                              │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Système de Règles et Contexte                          │
│  ├─ User Rules (priorité maximale absolue)              │
│  ├─ Règles de Projet (.cursor/rules/*.mdc)              │
│  ├─ CONTEXT.md (mémoire du projet)                      │
│  ├─ Memories (connaissances persistantes)                │
│  └─ Workflows (.cursor/workflows/*.md)                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Traitement par l'IA                                     │
│  ├─ Analyse du contexte                                  │
│  ├─ Application des règles                               │
│  ├─ Exécution des workflows                              │
│  └─ Génération de la réponse                             │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Action Exécutée                                         │
│  "Mise à jour des versions, commit, création MR"         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture du Système de Règles

### Structure des Fichiers

```
mcp-fetch-url/
├── .cursor/
│   ├── rules/                    # Règles Cursor (par contexte)
│   │   ├── context-maintenance.mdc
│   │   ├── development-workflow.mdc
│   │   ├── openai-apps-sdk-*.mdc
│   │   ├── project-structure.mdc
│   │   ├── release-process.mdc
│   │   ├── typescript-conventions.mdc
│   │   └── version-management.mdc
│   ├── workflows/                # Workflows automatisés
│   │   ├── README.md
│   │   ├── dev-complete.md
│   │   ├── release.md
│   │   ├── validate-pre-release.md
│   │   ├── build-and-test.md
│   │   └── sync-post-release.md
│   └── commands/                  # Commandes Cursor
│       ├── dev-server.md
│       ├── tunnel-only.md
│       ├── build.md
│       ├── rebuild.md
│       └── ...
├── CONTEXT.md                     # Mémoire du projet
└── (autres fichiers du projet)
```

### Types de Règles

1. **User Rules** : Règles personnalisées globales (priorité maximale absolue)
2. **Règles de Projet** : Règles spécifiques au projet (`.cursor/rules/`)
3. **Workflows** : Processus automatisés multi-étapes
4. **Commandes** : Actions simples exécutables
5. **CONTEXT.md** : Mémoire persistante du projet
6. **Memories** : Connaissances persistantes entre sessions

---

## 📊 Types de Règles et leur Priorité

### Hiérarchie de Priorité

```
1. User Rules (priorité MAXIMALE ABSOLUE)
   ↓
2. Règles de Projet avec alwaysApply: true
   ↓
3. Règles de Projet avec globs (selon le fichier ouvert)
   ↓
5. CONTEXT.md (contexte du projet)
   ↓
6. Memories (connaissances persistantes)
   ↓
7. Workflows (processus guidés)
   ↓
8. Commandes (actions simples)
```

### Quand Chaque Type est Utilisé

| Type | Quand | Priorité | Portée |
|------|-------|----------|--------|
| User Rules | Selon filtres | ⭐⭐⭐⭐⭐ MAX | Globale |
| Règles de Projet (alwaysApply: true) | Toujours | ⭐⭐⭐⭐ | Projet |
| Règles de Projet (globs) | Fichier correspondant | ⭐⭐⭐ | Contextuelle |
| CONTEXT.md | Au début de session | ⭐⭐⭐ | Projet |
| Memories | Quand pertinent | ⭐⭐ | Globale |
| Workflows | Sur demande | ⭐⭐ | Tâche spécifique |
| Commandes | Sur demande | ⭐ | Action simple |

---

## 📁 Règles de Projet (`.cursor/rules/`)

### Qu'est-ce que c'est ?

Les **règles de projet** sont des règles définies dans le dossier `.cursor/rules/` d'un projet spécifique. Elles permettent de guider l'IA sur les bonnes pratiques, conventions et processus spécifiques à ce projet.

### Pourquoi des Règles de Projet ?

**Problème** : Sans règles, l'IA pourrait :
- Ne pas suivre les conventions du projet
- Oublier des étapes importantes (ex: mettre à jour CONTEXT.md)
- Ne pas respecter les processus établis (ex: workflow de release)
- Générer du code qui ne respecte pas les standards du projet

**Solution** : Les règles de projet permettent de :
- ✅ **Standardiser** : Assurer que l'IA suit toujours les mêmes conventions
- ✅ **Automatiser** : Rappeler automatiquement les processus importants
- ✅ **Documenter** : Centraliser les bonnes pratiques du projet
- ✅ **Évoluer** : Facilement modifier les règles selon les besoins

### Format des Fichiers

Les règles de projet sont des fichiers Markdown avec frontmatter YAML :

```markdown
---
description: Description de la règle
globs: ["**/*.ts", "**/*.tsx"]  # Optionnel : fichiers concernés
alwaysApply: true  # Optionnel : toujours appliquer
---

# Titre de la Règle

Contenu de la règle...
```

### Types de Règles de Projet

Les règles peuvent être :
- **Toujours appliquées** (`alwaysApply: true`) : Actives pour tout le projet
- **Contextuelles** (`globs`) : Actives selon les fichiers ouverts
- **Documentation** : Disponibles pour référence

### Liste des Règles dans ce Projet

#### `context-maintenance.mdc`
- **Type** : `alwaysApply: true`
- **Rôle** : Maintenir CONTEXT.md à jour
- **Quand** : Avant chaque commit significatif
- **Contenu** : Checklist de mise à jour CONTEXT.md

#### `development-workflow.mdc`
- **Type** : Documentation
- **Rôle** : Expliquer le workflow de développement
- **Quand** : Référence pour l'IA
- **Contenu** : Commandes npm, workflow Git, processus de release

#### `openai-apps-sdk-*.mdc` (plusieurs fichiers)
- **Type** : `alwaysApply: true` (certains)
- **Rôle** : Règles pour développement MCP compatible ChatGPT Apps SDK
- **Quand** : Toujours (pour les règles principales)
- **Contenu** :
  - `openai-apps-sdk-main.mdc` : Règles principales
  - `openai-apps-sdk-tools.mdc` : Création de tools MCP
  - `openai-apps-sdk-responses.mdc` : Structure des réponses
  - `openai-apps-sdk-security.mdc` : Sécurité et authentification
  - `openai-apps-sdk-widgets.mdc` : Développement de widgets

#### `project-structure.mdc`
- **Type** : Documentation
- **Rôle** : Expliquer la structure du projet
- **Quand** : Référence pour comprendre l'architecture
- **Contenu** : Arborescence, organisation des fichiers

#### `release-process.mdc`
- **Type** : `alwaysApply: true`
- **Rôle** : Processus de release obligatoire
- **Quand** : Toujours (règle critique)
- **Contenu** : Checklist complète de release, règles strictes

#### `typescript-conventions.mdc`
- **Type** : `globs: ["**/*.ts", "**/*.tsx"]`
- **Rôle** : Conventions TypeScript
- **Quand** : Quand un fichier TypeScript est ouvert
- **Contenu** : Nommage, formatage, bonnes pratiques TypeScript

#### `version-management.mdc`
- **Type** : Documentation
- **Rôle** : Gestion des versions
- **Quand** : Référence pour les releases
- **Contenu** : Synchronisation des versions, tags Git

### Comment l'IA Utilise les Règles

#### 1. Au démarrage de Cursor

**Quand** : Dès que Cursor s'ouvre sur le projet

**Comment** :
```
1. Cursor scanne le dossier .cursor/rules/
2. Identifie les règles avec alwaysApply: true
3. Charge ces règles en mémoire
4. Les applique immédiatement (priorité maximale)
5. Les garde actives pour toute la session
```

**Pourquoi** : Les règles critiques doivent être disponibles dès le début pour guider l'IA dès les premières interactions.

**Exemple** :
- Règle `context-maintenance.mdc` avec `alwaysApply: true`
- → Chargée automatiquement au démarrage
- → L'IA sait qu'elle doit vérifier CONTEXT.md avant chaque commit

#### 2. Quand un fichier est ouvert

**Quand** : Dès qu'un fichier est ouvert dans l'éditeur

**Comment** :
```
1. Cursor détecte le fichier ouvert (ex: src/tools/fetchUrl.ts)
2. Compare le chemin avec les patterns globs des règles
3. Identifie les règles correspondantes (ex: **/*.ts)
4. Charge ces règles dans le contexte actif
5. Les applique pour ce fichier spécifique
```

**Pourquoi** : Les règles contextuelles ne sont pertinentes que pour certains fichiers. Les charger seulement quand nécessaire améliore les performances.

**Exemple** :
- Fichier `src/tools/fetchUrl.ts` ouvert
- Règle `typescript-conventions.mdc` avec `globs: ["**/*.ts"]`
- → Règle activée automatiquement
- → L'IA suit les conventions TypeScript pour ce fichier

#### 3. Pendant le traitement d'une requête

**Quand** : À chaque fois que l'utilisateur fait une requête

**Comment** :
```
1. L'IA reçoit la requête de l'utilisateur
2. Consulte d'abord les User Rules (priorité maximale absolue)
3. Consulte les règles de projet (alwaysApply: true)
4. Consulte les règles contextuelles (fichier ouvert, globs)
5. Consulte les règles disponibles (recherche sémantique)
6. Applique les règles pertinentes dans l'ordre de priorité
7. Génère la réponse en respectant toutes les règles
```

**Pourquoi** : L'ordre de priorité garantit que les règles les plus importantes sont appliquées en premier, et que les règles contextuelles sont prises en compte.

**Exemple** :
- Requête : "Faire une release 2.1.0"
- User Rules : Vérifie s'il y a des règles globales pertinentes
- Règles de projet (alwaysApply) : `release-process.mdc` → TOUJOURS demander la version
- Règles contextuelles : Si un fichier .ts est ouvert, applique les conventions TypeScript
- Résultat : L'IA demande confirmation de la version, puis suit le processus de release

---

## 👤 User Rules - Règles Personnalisées de l'Utilisateur

### Qu'est-ce que les User Rules ?

Les **User Rules** sont des règles personnalisées définies par l'utilisateur dans la configuration globale de Cursor. Elles s'appliquent à **tous les projets** de l'utilisateur et ont la **priorité maximale absolue**.

### Caractéristiques

- ✅ **Priorité maximale absolue** : Au-dessus de toutes les autres règles
- ✅ **Portée globale** : S'appliquent à tous les projets
- ✅ **Personnalisées** : Définies par l'utilisateur selon ses préférences
- ✅ **Persistantes** : Conservées dans la configuration Cursor

### Exemples de User Rules dans le Projet

#### 1. Visualization System

```markdown
# Visualization System

Rule for generating visual representations of project specifications, tasks, and knowledge.

<rule>
name: visualization_system
filters:
  - type: command
    pattern: "visualize"
  - type: command
    pattern: "diagram"
actions:
  - type: react
    conditions:
      - pattern: "visualize specs|diagram specs"
    action: |
      # Generate specification visualization
      ...
</rule>
```

**Comportement** :
- ✅ **Active** quand l'utilisateur demande "visualize" ou "diagram"
- ✅ **Priorité maximale** : L'IA doit générer des visualisations
- ✅ **Globale** : S'applique à tous les projets

#### 2. Autres Exemples Génériques

Les User Rules peuvent couvrir différents domaines selon les besoins de l'utilisateur :
- Conventions de code pour un langage spécifique
- Bonnes pratiques pour un framework particulier
- Processus de développement personnalisés
- Standards de documentation
- Etc.

### Comment l'IA Utilise les User Rules

**1. Au démarrage de Cursor** :
```
IA : Charge les User Rules depuis la configuration globale
  ↓
IA : Les garde en mémoire (priorité maximale absolue)
  ↓
IA : Les applique avant toutes les autres règles
```

**2. Pendant le travail** :
```
IA : Reçoit une requête
  ↓
IA : Consulte d'abord les User Rules (priorité maximale)
  ↓
IA : Applique les User Rules pertinentes
  ↓
IA : Puis consulte les autres règles
```

**3. Filtres et Conditions** :
```
User Rule avec filtre "visualize"
  ↓
Utilisateur : "visualize specs"
  ↓
IA : Détecte le pattern "visualize"
  ↓
IA : Active la User Rule "visualization_system"
  ↓
IA : Génère la visualisation
```

### Différence avec les Règles de Projet

| Aspect | User Rules | Règles de Projet (Cursor) |
|--------|------------|---------------------------|
| **Priorité** | ⭐⭐⭐⭐⭐ MAX | ⭐⭐⭐⭐ |
| **Portée** | Tous les projets | Projet spécifique |
| **Localisation** | Config Cursor globale | `.cursor/rules/` |
| **Personnalisation** | Par l'utilisateur | Par projet |
| **Filtres** | Oui (command, event, etc.) | Oui (globs) |

### Exemples d'Utilisation

#### Exemple 1 : Visualisation

**Requête** : "visualize specs"

**Flux** :
```
1. User Rule "visualization_system" détecte "visualize"
2. Active la règle
3. Génère la visualisation des spécifications
4. Affiche le résultat
```

#### Exemple 2 : Convention de Code

**Requête** : "Créer une classe UserProfile"

**Flux** :
```
1. User Rule "Coding Standards" active (selon le langage)
2. L'IA suit les conventions du langage
3. Applique les standards de nommage
4. Génère le code selon les standards
```

---

#### 1. Règles avec `alwaysApply: true`

**Quand utiliser** : Pour les règles **critiques** qui doivent **toujours** être respectées, quelle que soit la tâche.

**Pourquoi** : Certaines règles sont si importantes qu'elles ne doivent jamais être oubliées, même si l'IA travaille sur une tâche différente.

**Exemple** : `context-maintenance.mdc`

```markdown
---
description: Maintien du fichier CONTEXT.md
globs: 
alwaysApply: true
---
```

**Comment ça fonctionne** :
1. **Au démarrage de Cursor** : La règle est chargée automatiquement
2. **Pendant toute la session** : La règle reste active en mémoire
3. **Avant chaque action** : L'IA consulte cette règle
4. **Application** : L'IA suit la règle avant d'exécuter l'action

**Comportement** :
- ✅ **Toujours chargée** au démarrage de Cursor pour ce projet
- ✅ **Toujours appliquée** quelle que soit la tâche
- ✅ **Priorité élevée** : l'IA doit suivre ces règles en priorité
- ✅ **Spécifique au projet** : Ne s'applique qu'à ce projet

**Quand utiliser `alwaysApply: true`** :
- ✅ Règles critiques qui doivent toujours être respectées
- ✅ Processus obligatoires (ex: mise à jour CONTEXT.md avant commit)
- ✅ Bonnes pratiques fondamentales du projet
- ✅ Règles qui ne dépendent pas du contexte (fichier ouvert, etc.)

**Quand NE PAS utiliser `alwaysApply: true`** :
- ❌ Règles spécifiques à un type de fichier (utiliser `globs` à la place)
- ❌ Règles optionnelles ou contextuelles
- ❌ Documentation de référence (pas besoin de `alwaysApply`)

#### 2. Règles avec `globs` (fichiers spécifiques)

**Quand utiliser** : Pour les règles qui s'appliquent **seulement** à certains types de fichiers.

**Pourquoi** : Certaines règles ne sont pertinentes que pour certains fichiers. Par exemple, les conventions TypeScript ne s'appliquent pas aux fichiers Markdown.

**Exemple** : `typescript-conventions.mdc`

```markdown
---
description: Conventions TypeScript
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---
```

**Comment ça fonctionne** :
1. **Utilisateur ouvre un fichier** : Par exemple `src/tools/fetchUrl.ts`
2. **Cursor détecte le pattern** : Le fichier correspond à `**/*.ts`
3. **Règle activée** : La règle `typescript-conventions.mdc` est chargée
4. **Application** : L'IA suit les conventions TypeScript pour ce fichier
5. **Fichier fermé** : La règle reste disponible mais moins prioritaire

**Comportement** :
- ✅ **Chargée** quand un fichier correspondant est ouvert
- ✅ **Appliquée** seulement pour les fichiers correspondants (`.ts` et `.tsx` ici)
- ✅ **Contextuelle** : L'IA suit ces règles uniquement pour le code TypeScript
- ✅ **Spécifique au projet** : Ne s'applique qu'à ce projet
- ✅ **Performance** : Ne charge que ce qui est nécessaire

**Quand utiliser `globs`** :
- ✅ Conventions de code par langage (TypeScript, Python, etc.)
- ✅ Règles spécifiques à certains types de fichiers
- ✅ Bonnes pratiques contextuelles
- ✅ Quand la règle n'est pertinente que pour certains fichiers

**Quand NE PAS utiliser `globs`** :
- ❌ Règles qui doivent s'appliquer à tout le projet (utiliser `alwaysApply: true`)
- ❌ Processus qui ne dépendent pas du fichier ouvert
- ❌ Règles critiques qui doivent toujours être actives

**Exemples de patterns `globs`** :
- `["**/*.ts", "**/*.tsx"]` : Tous les fichiers TypeScript
- `["**/*.py"]` : Tous les fichiers Python
- `["src/**/*.ts"]` : Fichiers TypeScript dans `src/` seulement
- `["**/*.test.ts"]` : Fichiers de test TypeScript

#### 3. Règles de documentation

**Quand utiliser** : Pour documenter des processus, workflows ou informations de référence qui ne nécessitent pas d'application automatique.

**Pourquoi** : Certaines informations sont utiles à l'IA mais ne doivent pas être appliquées automatiquement. Elles servent de référence quand l'IA en a besoin.

**Exemple** : `development-workflow.mdc`

```markdown
---
description: Workflow de développement
globs: 
alwaysApply: false
---
```

**Comment ça fonctionne** :
1. **Règle chargée** : Disponible dans le système de règles
2. **Pas d'application automatique** : L'IA ne la suit pas automatiquement
3. **Recherche sémantique** : L'IA peut la trouver quand elle cherche des informations
4. **Référence** : L'IA peut la consulter pour comprendre un processus

**Comportement** :
- ✅ **Chargée** mais pas automatiquement appliquée
- ✅ **Disponible** pour référence via recherche sémantique
- ✅ **Utilisée** quand l'IA en a besoin (ex: "Comment faire une release ?")
- ✅ **Non intrusive** : N'interfère pas avec le travail normal

**Quand utiliser (sans `alwaysApply` ni `globs`)** :
- ✅ Documentation de processus (workflows, guides)
- ✅ Références pour l'IA (comment faire X, comment utiliser Y)
- ✅ Guides contextuels (architecture, décisions techniques)
- ✅ Informations utiles mais non critiques

**Quand NE PAS utiliser ce type** :
- ❌ Règles critiques qui doivent toujours être suivies (utiliser `alwaysApply: true`)
- ❌ Règles spécifiques à certains fichiers (utiliser `globs`)
- ❌ Processus obligatoires (utiliser `alwaysApply: true`)

### Différence avec les User Rules

| Aspect | User Rules | Règles de Projet |
|--------|------------|------------------|
| **Portée** | Tous les projets | Projet spécifique |
| **Priorité** | ⭐⭐⭐⭐⭐ MAX | ⭐⭐⭐⭐ |
| **Localisation** | Config Cursor globale | `.cursor/rules/` |
| **Modification** | Via configuration Cursor | Via fichiers du projet |
| **Filtres** | Oui (command, event, etc.) | Oui (globs) |
| **Quand utiliser** | Règles personnalisées globales | Règles spécifiques au projet |
| **Pourquoi** | Préférences personnelles de l'utilisateur | Conventions et processus du projet |

**Quand utiliser User Rules vs Règles de Projet** :

- **User Rules** : Pour vos préférences personnelles qui s'appliquent à tous vos projets
  - Exemple : "Toujours utiliser camelCase pour les variables"
  - Exemple : "Générer des visualisations quand demandé"

- **Règles de Projet** : Pour les conventions et processus spécifiques à ce projet
  - Exemple : "Mettre à jour CONTEXT.md avant chaque commit" (spécifique à ce projet)
  - Exemple : "Suivre le workflow Gitflow avec branches release/" (spécifique à ce projet)

---

## 🔄 Workflows Cursor (`.cursor/workflows/`)

### Qu'est-ce qu'un Workflow ?

Un workflow est un **processus automatisé multi-étapes** que l'IA peut exécuter. C'est un guide détaillé avec des instructions précises pour accomplir une tâche complexe.

### Format des Workflows

```markdown
---
description: 📦 Description du workflow
---

# Titre du Workflow

## Étapes

### 1. Étape 1
Instructions détaillées...

### 2. Étape 2
Commandes bash à exécuter...
```

### Workflows Disponibles

#### 1. `dev-complete` - Développement Complet

**Description** : Démarre l'environnement de développement complet

**Utilisation** : `Cmd+Shift+P` → `dev-complete`

**Étapes** :
1. Nettoie les processus existants
2. Lance ngrok en arrière-plan
3. Lance le serveur dev
4. Vérifie la santé du serveur

**Comment l'IA l'utilise** :
- L'utilisateur demande : "Lance le dev complet"
- L'IA exécute le workflow `dev-complete`
- Suit les étapes une par une
- Exécute les commandes bash
- Vérifie les résultats

#### 2. `release` - Processus de Release

**Description** : Processus complet de release avec mise à jour de toutes les versions

**Utilisation** : `Cmd+Shift+P` → `release`

**⚠️ Nécessite interaction** : L'IA demandera la version avant de commencer

**Étapes** :
1. **Demander la version** : L'IA DOIT demander "Quelle version voulez-vous faire ?"
2. Vérifier la branche (doit être `develop`)
3. Mettre à jour `package.json`
4. Mettre à jour `src/servers/http.ts`
5. Mettre à jour `src/http-client.ts`
6. Mettre à jour `src/servers/stdio.ts`
7. Mettre à jour `README.md` (badge version)
8. Mettre à jour `CONTEXT.md` (changelog)
9. Vérifier la cohérence
10. Commit les changements
11. Push et créer la MR

**Comment l'IA l'utilise** :
- L'utilisateur demande : "Faire une release"
- L'IA exécute le workflow `release`
- **Étape 1** : Demande la version (interaction requise)
- **Étapes 2-8** : Met à jour tous les fichiers (automatique)
- **Étape 9** : Vérifie la cohérence (automatique)
- **Étapes 10-11** : Commit et push (automatique)

#### 3. `validate-pre-release` - Validation Pré-Release

**Description** : Vérifie que tout est prêt avant une release

**Utilisation** : `Cmd+Shift+P` → `validate-pre-release`

**Étapes** :
1. Vérifie la branche
2. Vérifie les fichiers non commités
3. Vérifie la cohérence des versions
4. Vérifie README.md et CONTEXT.md
5. Build et typecheck

**Comment l'IA l'utilise** :
- L'utilisateur demande : "Vérifier avant release"
- L'IA exécute le workflow `validate-pre-release`
- Exécute toutes les vérifications
- Rapporte les problèmes trouvés

#### 4. `build-and-test` - Build et Test

**Description** : Build le projet et vérifie que tout fonctionne

**Utilisation** : `Cmd+Shift+P` → `build-and-test`

**Étapes** :
1. Clean
2. Build
3. Typecheck
4. Démarre le serveur temporairement
5. Health check
6. Arrête le serveur

**Comment l'IA l'utilise** :
- L'utilisateur demande : "Build et teste"
- L'IA exécute le workflow `build-and-test`
- Suit toutes les étapes
- Rapporte les résultats

#### 5. `sync-post-release` - Synchronisation Post-Release

**Description** : Synchronise `develop` avec `main` après une release

**Utilisation** : `Cmd+Shift+P` → `sync-post-release`

**Prérequis** :
- La release a été mergée dans `main`
- Le tag a été créé
- On est sur `develop`

**Étapes** :
1. Vérifie qu'on est sur `develop`
2. Récupère `main`
3. Merge `main` dans `develop` (normal, sans squash)
4. Push `develop`

**Comment l'IA l'utilise** :
- L'utilisateur demande : "Synchroniser après release"
- L'IA exécute le workflow `sync-post-release`
- Vérifie les prérequis
- Exécute la synchronisation

### Comment l'IA Utilise les Workflows

**1. Détection du workflow** :
```
Utilisateur : "Faire une release"
  ↓
IA : Identifie le workflow "release"
  ↓
IA : Charge le fichier .cursor/workflows/release.md
```

**2. Exécution étape par étape** :
```
IA : Lit les étapes du workflow
  ↓
IA : Exécute l'étape 1 (demander version)
  ↓
IA : Attend la réponse de l'utilisateur
  ↓
IA : Exécute l'étape 2 (vérifier branche)
  ↓
IA : Continue jusqu'à la fin
```

**3. Gestion des interactions** :
```
Workflow avec interaction (ex: release)
  ↓
IA : Exécute jusqu'à l'étape d'interaction
  ↓
IA : Demande à l'utilisateur
  ↓
IA : Attend la réponse
  ↓
IA : Continue avec la réponse
```

---

## ⌨️ Commandes Cursor (`.cursor/commands/`)

### Qu'est-ce qu'une Commande ?

Une commande est une **action simple** exécutable via `Cmd+Shift+P`. C'est plus simple qu'un workflow : une seule action, pas de multi-étapes.

### Format des Commandes

```markdown
---
description: 🌟 Description de la commande
---

Instructions pour exécuter la commande...

```bash
cd $WORKSPACE && npm run dev
```
```

### Commandes Disponibles

#### `dev-server.md`
- **Description** : Lance le serveur MCP dev avec hot-reload
- **Commande** : `npm run dev`
- **Utilisation** : `Cmd+Shift+P` → `dev-server`

#### `tunnel-only.md`
- **Description** : Lance ngrok (tunnel)
- **Commande** : `npm run tunnel`
- **Utilisation** : `Cmd+Shift+P` → `tunnel-only`

#### `build.md`
- **Description** : Compile TypeScript
- **Commande** : `npm run build`
- **Utilisation** : `Cmd+Shift+P` → `build`

#### `rebuild.md`
- **Description** : Clean + Build
- **Commande** : `npm run rebuild`
- **Utilisation** : `Cmd+Shift+P` → `rebuild`

#### `mcp-inspector.md`
- **Description** : Lance MCP Inspector
- **Commande** : `npm run inspect`
- **Utilisation** : `Cmd+Shift+P` → `mcp-inspector`

#### `health-check.md`
- **Description** : Health check du serveur
- **Commande** : `npm run health`
- **Utilisation** : `Cmd+Shift+P` → `health-check`

#### `kill-server.md`
- **Description** : Tue le processus sur le port
- **Commande** : `npm run kill`
- **Utilisation** : `Cmd+Shift+P` → `kill-server`

#### `kill-tunnel.md`
- **Description** : Tue ngrok
- **Commande** : `npm run kill:tunnel`
- **Utilisation** : `Cmd+Shift+P` → `kill-tunnel`

### Comment l'IA Utilise les Commandes

**1. Détection de la commande** :
```
Utilisateur : "Lance le serveur dev"
  ↓
IA : Identifie la commande "dev-server"
  ↓
IA : Charge le fichier .cursor/commands/dev-server.md
```

**2. Exécution** :
```
IA : Lit les instructions
  ↓
IA : Exécute la commande bash
  ↓
IA : Rapporte le résultat
```

**3. Variables disponibles** :
- `$WORKSPACE` : Chemin du workspace actuel
- L'IA remplace automatiquement ces variables

---

## 🧠 CONTEXT.md - La Mémoire du Projet

### Qu'est-ce que CONTEXT.md ?

`CONTEXT.md` est le **fichier de mémoire du projet**. Il contient toutes les informations importantes sur le projet : décisions techniques, structure, changelog, etc.

### Structure de CONTEXT.md

```markdown
# 🧠 CONTEXT - Scrapidou

**Last update**: 2025-01-27 (v2.0.1)
**Status**: ✅ Production ready

## 📋 Overview
- Nom du projet
- Description
- Technologies

## 🎯 Key Decisions
- Décisions techniques importantes
- Pourquoi ces décisions

## 🏗️ Project Structure
- Arborescence des fichiers
- Organisation du code

## ✅ Current Status
- Ce qui est implémenté
- Ce qui est en cours
- Ce qui est à faire

## 📝 Changelog
- Historique des versions
- Changements par version

## 💡 Technical Notes
- Notes techniques
- Patterns utilisés
- Flows détaillés
```

### Comment l'IA Utilise CONTEXT.md

**1. Au début de la session** :
```
IA : Ouvre le projet
  ↓
IA : Lit CONTEXT.md en premier
  ↓
IA : Comprend le contexte du projet
  ↓
IA : Charge les informations en mémoire
```

**2. Pendant le travail** :
```
IA : Reçoit une requête
  ↓
IA : Consulte CONTEXT.md pour le contexte
  ↓
IA : Utilise les informations pour répondre
```

**3. Mise à jour** :
```
IA : Fait un changement important
  ↓
IA : Rappelle la règle "context-maintenance.mdc"
  ↓
IA : Met à jour CONTEXT.md
  ↓
IA : Commit avec CONTEXT.md à jour
```

### Règles de Mise à Jour

**Obligatoire (avant commit)** :
- ✅ Nouveau tool implémenté → Mettre à jour "Ce qui est implémenté"
- ✅ Décision technique importante → Ajouter dans "Décisions Clés"
- ✅ Release/version → Ajouter entrée dans "Changelog"

**Recommandé** :
- Fin de session de travail significative
- Après résolution d'un bug complexe
- Après ajout de nouvelles fonctionnalités

### Sections Importantes

#### 1. Header
```markdown
**Last update**: YYYY-MM-DD  ← Mettre à jour !
**Status**: 🚧 En développement | ✅ Production ready
```

#### 2. Key Decisions
- Décisions techniques avec les "pourquoi"
- Architecture choisie et raisons
- Patterns utilisés

#### 3. Current Status
- ✅ Fait
- 🔜 À faire
- 🚧 En cours
- ❌ Abandonné

#### 4. Changelog
- Historique complet des versions
- Changements détaillés par version
- Tags Git correspondants

---

## 💾 Memories - Connaissances Persistantes

### Qu'est-ce qu'une Memory ?

Une memory est une **connaissance persistante** que l'IA garde entre les sessions. C'est une information importante qui doit être rappelée à chaque fois.

### Exemples de Memories dans le Projet

#### 1. Workflow Gitflow Strict

```
Pour TOUS les projets MCP, un workflow gitflow STRICT doit être respecté :

**Configuration Git obligatoire** :
- user.email DOIT être "jessy.bonnotte@gmail.com" (JAMAIS insideapp.fr)

**Branches** :
- `main` : production (déploiement automatique)
- `release/X.Y.Z` : développement de la prochaine version

**Workflow de release OBLIGATOIRE** :
1. Créer `release/X.Y.Z` depuis `main`
2. Développer sur `release/X.Y.Z`
3. Avant merge : incrémenter version dans package.json ET tous les fichiers source
4. **Merger dans `main` TOUJOURS avec `--squash`** (UN SEUL commit par release)
5. Créer tag au format `X.Y.Z` (SANS "v")
```

**Comportement** :
- ✅ **Toujours rappelée** : l'IA doit suivre ce workflow pour tous les projets MCP
- ✅ **Priorité élevée** : ne peut pas être ignorée
- ✅ **Persistante** : gardée entre les sessions

#### 2. Vérification des Fichiers .md avant Commit

```
Avant TOUT commit git, je dois TOUJOURS vérifier que tous les fichiers .md sont à jour et cohérents:

**Checklist Pré-Commit**:
1. Rechercher les références obsolètes
2. Vérifier que README.md reflète l'état actuel
3. Vérifier que CONTEXT.md est à jour
4. Utiliser `grep` pour trouver les patterns obsolètes
```

**Comportement** :
- ✅ **Toujours rappelée** : l'IA doit vérifier avant chaque commit
- ✅ **Priorité élevée** : règle critique
- ✅ **Persistante** : gardée entre les sessions

#### 3. Maintenance du CONTEXT.md

```
Pour tous les projets de développement, je dois maintenir un fichier CONTEXT.md qui contient:

**Structure du CONTEXT.md**:
- Vue d'ensemble du projet
- Décisions clés prises
- Structure du projet
- Prochaines étapes / TODO
- Historique des changements importants
```

**Comportement** :
- ✅ **Toujours rappelée** : l'IA doit maintenir CONTEXT.md
- ✅ **Priorité élevée** : règle fondamentale
- ✅ **Persistante** : gardée entre les sessions

### Comment l'IA Utilise les Memories

**1. Au début de la session** :
```
IA : Charge les memories
  ↓
IA : Les garde en mémoire
  ↓
IA : Les applique automatiquement
```

**2. Pendant le travail** :
```
IA : Reçoit une requête
  ↓
IA : Consulte les memories pertinentes
  ↓
IA : Applique les memories
```

**3. Mise à jour** :
```
IA : Découvre une nouvelle information importante
  ↓
IA : Crée une nouvelle memory
  ↓
IA : La garde pour les prochaines sessions
```

---

## 🎯 Ordre de Priorité et Application

### Hiérarchie Complète

```
1. User Rules
   └─ Priorité MAXIMALE ABSOLUE
   └─ Toujours actives (selon filtres)
   └─ Exemples : Visualization System, conventions personnalisées

2. Règles de Projet (alwaysApply: true)
   └─ Priorité TRÈS ÉLEVÉE
   └─ Toujours actives pour le projet
   └─ Exemples : context-maintenance.mdc, release-process.mdc

3. Règles de Projet (globs)
   └─ Priorité ÉLEVÉE
   └─ Actives selon le fichier ouvert
   └─ Exemples : typescript-conventions.mdc (pour .ts/.tsx)

5. CONTEXT.md
   └─ Priorité MOYENNE
   └─ Chargé au début de session
   └─ Contexte du projet

6. Memories
   └─ Priorité MOYENNE
   └─ Connaissances persistantes
   └─ Rappelées quand pertinent

7. Workflows
   └─ Priorité VARIABLE
   └─ Exécutés sur demande
   └─ Guides multi-étapes

8. Commandes
   └─ Priorité BASSE
   └─ Exécutées sur demande
   └─ Actions simples
```

### Exemple d'Application

**Scénario** : L'utilisateur demande "Faire une release 2.1.0"

**1. User Rules** :
```
✅ User Rule "Visualization System" : Si "visualize" détecté
   → L'IA génère une visualisation
```

**2. Règles de Projet (alwaysApply: true)** :
```
✅ Règle "release-process.mdc" : TOUJOURS demander la version
   → L'IA demande : "Quelle version voulez-vous faire ? 2.1.0 ?"
```

**3. Règles de Projet (alwaysApply: true) - Checklist** :
```
✅ Règle "release-process.mdc" : Checklist complète de release
   → L'IA suit la checklist
```

**4. Règles de Projet (globs)** :
```
✅ Règle "typescript-conventions.mdc" : Pour les fichiers .ts modifiés
   → L'IA respecte les conventions TypeScript
```

**5. CONTEXT.md** :
```
✅ Contexte du projet : Version actuelle, changelog
   → L'IA comprend le contexte
```

**6. Memories** :
```
✅ Memory "Workflow Gitflow" : Merge avec --squash
   → L'IA suit le workflow Gitflow
```

**7. Workflow** :
```
✅ Workflow "release.md" : Processus détaillé
   → L'IA exécute le workflow étape par étape
```

**8. Commandes** :
```
✅ Commande "build.md" : Pour build avant release
   → L'IA exécute la commande si nécessaire
```

---

## 🔀 Flux de Traitement d'une Requête

### Exemple Complet : "Faire une release 2.1.0"

#### Phase 1 : Réception de la Requête

```
Utilisateur : "Faire une release 2.1.0"
  ↓
IA : Reçoit la requête
```

#### Phase 2 : Chargement du Contexte

```
IA : Charge les règles de projet (alwaysApply: true)
  ├─→ "release-process.mdc" : Checklist complète de release
  └─→ "context-maintenance.mdc" : Mettre à jour CONTEXT.md avant commit
  ↓
IA : Lit CONTEXT.md
  ├─→ Version actuelle : 2.0.1
  ├─→ Branche actuelle : develop
  └─→ Changelog : historique des versions
  ↓
IA : Consulte les memories
  ├─→ "Workflow Gitflow" : Merge avec --squash
  └─→ "Vérification .md" : Vérifier avant commit
```

#### Phase 3 : Application des Règles

```
IA : Applique la règle "TOUJOURS demander la version"
  ↓
IA : Demande confirmation : "Quelle version voulez-vous faire ? 2.1.0 ?"
  ↓
Utilisateur : "Oui"
  ↓
IA : Confirme la version : 2.1.0
```

#### Phase 4 : Exécution du Workflow

```
IA : Identifie le workflow "release.md"
  ↓
IA : Charge le workflow
  ↓
IA : Exécute étape par étape :

Étape 1 : Vérifier la branche
  ├─→ git branch --show-current
  └─→ Résultat : develop ✅

Étape 2 : Mettre à jour package.json
  ├─→ Modifie "version": "2.1.0"
  └─→ Sauvegarde

Étape 3 : Mettre à jour src/servers/http.ts
  ├─→ Recherche toutes les occurrences de version
  ├─→ Remplace par "2.1.0"
  └─→ Sauvegarde

Étape 4 : Mettre à jour src/http-client.ts
  ├─→ Vérifie la présence de version
  ├─→ Met à jour si présent
  └─→ Sauvegarde

Étape 5 : Mettre à jour src/servers/stdio.ts
  ├─→ Vérifie la présence de version
  ├─→ Met à jour si présent
  └─→ Sauvegarde

Étape 6 : Mettre à jour README.md
  ├─→ Met à jour le badge version (ligne 6)
  └─→ Sauvegarde

Étape 7 : Mettre à jour CONTEXT.md
  ├─→ Ajoute entrée changelog "v2.1.0"
  ├─→ Met à jour "Last update"
  └─→ Sauvegarde

Étape 8 : Vérifier la cohérence
  ├─→ Vérifie que toutes les versions correspondent
  └─→ Résultat : ✅ Cohérent

Étape 9 : Commit
  ├─→ git add package.json src/**/*.ts README.md CONTEXT.md
  ├─→ git commit -m "chore: bump version to 2.1.0..."
  └─→ Résultat : ✅ Commité

Étape 10 : Push
  ├─→ git push origin develop
  └─→ Résultat : ✅ Pushé
```

#### Phase 5 : Rapport Final

```
IA : Rapporte les actions effectuées
  ├─→ ✅ Version mise à jour dans tous les fichiers
  ├─→ ✅ CONTEXT.md mis à jour
  ├─→ ✅ Commit créé
  ├─→ ✅ Push effectué
  └─→ 📝 Créer une MR avec le titre "Release 2.1.0"
```

---

## 📚 Exemples Concrets

### Exemple 1 : Développement d'une Nouvelle Feature

**Requête** : "Ajouter un nouveau tool `fetch_metadata`"

**Flux** :

1. **Règles de Projet (alwaysApply: true)** :
   - ✅ "Maintenance CONTEXT.md" : Mettre à jour après implémentation

2. **Règles de Projet (globs)** :
   - ✅ "openai-apps-sdk-tools.mdc" : Conventions pour créer un tool MCP
   - ✅ "typescript-conventions.mdc" : Conventions TypeScript (fichiers .ts)

3. **CONTEXT.md** :
   - ✅ Comprend la structure du projet
   - ✅ Voit les tools existants

4. **Workflow** :
   - ✅ Pas de workflow spécifique, mais suit les règles

5. **Actions de l'IA** :
   ```
   1. Crée src/tools/fetchMetadata.ts
   2. Suit les conventions (nommage, annotations, etc.)
   3. Enregistre le tool dans src/servers/http.ts
   4. Enregistre le tool dans src/servers/stdio.ts
   5. Met à jour CONTEXT.md (nouveau tool implémenté)
   6. Commit avec CONTEXT.md à jour
   ```

### Exemple 2 : Correction d'un Bug

**Requête** : "Corriger le bug dans extractTextContent"

**Flux** :

1. **Règles de Projet (alwaysApply: true)** :
   - ✅ Pas de règle spécifique

2. **Règles de Projet (globs)** :
   - ✅ "typescript-conventions.mdc" : Conventions TypeScript

3. **CONTEXT.md** :
   - ✅ Comprend la fonction extractTextContent
   - ✅ Voit les notes techniques

4. **Actions de l'IA** :
   ```
   1. Lit src/utils/contentExtractor.ts
   2. Identifie le bug
   3. Corrige le bug
   4. Teste la correction
   5. Commit la correction
   ```

### Exemple 3 : Validation avant Release

**Requête** : "Vérifier que tout est prêt pour la release"

**Flux** :

1. **Règles de Projet (alwaysApply: true)** :
   - ✅ "release-process.mdc" : Vérifications obligatoires avant release

2. **Workflow** :
   - ✅ "validate-pre-release.md" : Processus de validation

3. **Actions de l'IA** :
   ```
   1. Exécute le workflow validate-pre-release
   2. Vérifie la branche (develop)
   3. Vérifie les fichiers non commités
   4. Vérifie la cohérence des versions
   5. Vérifie README.md et CONTEXT.md
   6. Build et typecheck
   7. Rapporte les résultats
   ```

---

## 🎓 Résumé : Comment l'IA Utilise Tout Cela

### Au Démarrage de Cursor

```
1. Charge les User Rules (priorité maximale absolue)
2. Charge les règles de projet (alwaysApply: true)
3. Lit CONTEXT.md (contexte du projet)
4. Charge les memories (connaissances persistantes)
5. Prêt à travailler
```

### Pendant le Travail

```
1. Reçoit une requête de l'utilisateur
2. Consulte d'abord les User Rules (priorité maximale absolue)
3. Consulte les règles pertinentes (priorité)
4. Consulte CONTEXT.md (contexte)
5. Consulte les memories (connaissances)
6. Identifie les workflows/commandes nécessaires
7. Exécute les actions
8. Met à jour CONTEXT.md si nécessaire
9. Rapporte les résultats
```

### Avant un Commit

```
1. Rappelle la règle "Maintenance CONTEXT.md"
2. Vérifie que CONTEXT.md est à jour
3. Vérifie que tous les .md sont cohérents (memory)
4. Commit avec CONTEXT.md à jour
```

### Pour une Release

```
1. Rappelle la règle "TOUJOURS demander la version"
2. Demande la version à l'utilisateur
3. Exécute le workflow "release.md"
4. Suit toutes les étapes
5. Met à jour CONTEXT.md (changelog)
6. Commit et push
7. Guide pour créer la MR
```

---

## 🔧 Maintenance du Système

### Ajouter une Nouvelle Règle

1. **Créer le fichier** : `.cursor/rules/nouvelle-regle.mdc`
2. **Ajouter le frontmatter** :
   ```markdown
   ---
   description: Description de la règle
   globs: ["**/*.ts"]  # Optionnel
   alwaysApply: false  # Optionnel
   ---
   ```
3. **Écrire le contenu** : Instructions détaillées
4. **Tester** : Vérifier que l'IA applique la règle

### Ajouter un Nouveau Workflow

1. **Créer le fichier** : `.cursor/workflows/nouveau-workflow.md`
2. **Ajouter le frontmatter** :
   ```markdown
   ---
   description: 📦 Description du workflow
   ---
   ```
3. **Écrire les étapes** : Instructions détaillées étape par étape
4. **Tester** : Exécuter via `Cmd+Shift+P`

### Ajouter une Nouvelle Commande

1. **Créer le fichier** : `.cursor/commands/nouvelle-commande.md`
2. **Ajouter le frontmatter** :
   ```markdown
   ---
   description: 🌟 Description de la commande
   ---
   ```
3. **Écrire les instructions** : Commande bash à exécuter
4. **Tester** : Exécuter via `Cmd+Shift+P`

### Mettre à Jour CONTEXT.md

1. **Rappeler la règle** : "Maintenance CONTEXT.md"
2. **Vérifier les sections** :
   - Header (date, status)
   - Key Decisions (nouvelles décisions)
   - Current Status (nouveaux éléments)
   - Changelog (nouvelles versions)
3. **Mettre à jour** : Ajouter les informations
4. **Commit** : Avec les autres changements

---

## 📊 Tableau Récapitulatif

| Élément | Localisation | Priorité | Quand | Portée |
|---------|--------------|----------|-------|--------|
| **User Rules** | Config Cursor globale | ⭐⭐⭐⭐⭐ MAX | Selon filtres | Globale |
| **Règles de Projet (alwaysApply)** | `.cursor/rules/*.mdc` | ⭐⭐⭐⭐ | Toujours | Projet |
| **Règles de Projet (globs)** | `.cursor/rules/*.mdc` | ⭐⭐⭐ | Fichier ouvert | Contextuelle |
| **CONTEXT.md** | Racine projet | ⭐⭐⭐ | Début session | Projet |
| **Memories** | Base de données Cursor | ⭐⭐ | Quand pertinent | Globale |
| **Workflows** | `.cursor/workflows/*.md` | ⭐⭐ | Sur demande | Tâche |
| **Commandes** | `.cursor/commands/*.md` | ⭐ | Sur demande | Action |

---

**Document maintenu par** : AI Assistant (Claude)  
**Pour** : Jessy Bonnotte (@rankorr)  
**Dernière mise à jour** : 2025-01-27

