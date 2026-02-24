# 🔄 Boucles de Rétroaction via les Règles - Guide Exhaustif

**Dernière mise à jour** : 2025-01-27  
**Version** : 1.0.0

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Qu'est-ce qu'une Boucle de Rétroaction ?](#quest-ce-quune-boucle-de-rétroaction)
3. [Types de Boucles de Rétroaction](#types-de-boucles-de-rétroaction)
4. [Boucles via les Règles de Projet](#boucles-via-les-règles-de-projet)
5. [Boucles via les Règles Always Applied](#boucles-via-les-règles-always-applied)
6. [Boucles via les Règles Contextuelles (globs)](#boucles-via-les-règles-contextuelles-globs)
7. [Boucles en Cascade](#boucles-en-cascade)
8. [Exemples Concrets](#exemples-concrets)
9. [Optimisation des Boucles](#optimisation-des-boucles)
10. [Créer de Nouvelles Boucles](#créer-de-nouvelles-boucles)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que ce document ?

Ce document explique **comment les règles Cursor créent des boucles de rétroaction automatiques** pour détecter et corriger les problèmes avant qu'ils ne se propagent dans le projet.

### Pourquoi des Boucles de Rétroaction ?

**Problème** : Sans boucles de rétroaction, les erreurs peuvent :
- Se propager dans le code
- Être découvertes tardivement (en production)
- Nécessiter des corrections coûteuses
- Créer de l'incohérence dans le projet

**Solution** : Les boucles de rétroaction permettent de :
- ✅ **Détecter tôt** : Problèmes identifiés immédiatement
- ✅ **Corriger rapidement** : Feedback immédiat pour ajuster
- ✅ **Maintenir la qualité** : Standards respectés automatiquement
- ✅ **Éviter la régression** : Problèmes récurrents prévenus

---

## 🔄 Qu'est-ce qu'une Boucle de Rétroaction ?

### Définition

Une **boucle de rétroaction** est un mécanisme qui :
1. **Détecte** un problème ou une incohérence
2. **Informe** l'IA (ou le développeur) du problème
3. **Corrige** ou **guide** vers la correction
4. **Vérifie** que la correction est appliquée

### Schéma d'une Boucle

```
Action (création/modification)
    ↓
Détection (règle active)
    ↓
Problème identifié ?
    ├─→ OUI → Feedback → Correction → Vérification → ✅
    └─→ NON → Continue → ✅
```

### Exemple Simple

```
1. Créer un fichier src/tools/newTool.ts
   ↓
2. Règle "typescript-conventions.mdc" active (globs: **/*.ts)
   ↓
3. Détecte : Nom de fonction pas en camelCase
   ↓
4. Feedback : "La fonction doit être en camelCase"
   ↓
5. Correction : Renommer la fonction
   ↓
6. Vérification : Règle vérifie à nouveau
   ↓
7. ✅ Conforme
```

---

## 📊 Types de Boucles de Rétroaction

### 1. Boucles Automatiques (Compilation/Build)

**Quand** : Pendant la compilation ou le build

**Détection** :
- Erreurs TypeScript
- Imports manquants
- Types incorrects
- Syntaxe invalide

**Rétroaction** :
- Messages d'erreur avec numéros de ligne
- Suggestions de correction

**Action** :
- Corriger les erreurs
- Rebuild

**Exemple** :
```bash
npm run build
# ❌ Erreur : Cannot find module './types'
# → Corriger l'import
# → Rebuild
# ✅ OK
```

### 2. Boucles via Règles (Always Applied)

**Quand** : Toujours, règles avec `alwaysApply: true`

**Détection** :
- Checklist automatique
- Vérifications obligatoires
- Standards à respecter

**Rétroaction** :
- Rappel des règles
- Checklist à compléter
- Alerte si non conforme

**Action** :
- Suivre la checklist
- Corriger les incohérences

**Exemple** :
```
Règle "context-maintenance.mdc" (alwaysApply: true)
→ Avant chaque commit
→ Vérifie : CONTEXT.md à jour ?
→ Si NON : Rappel → Mettre à jour → Vérifier → ✅
```

### 3. Boucles via Règles Contextuelles (globs)

**Quand** : Quand un fichier correspondant est ouvert/modifié

**Détection** :
- Conventions spécifiques au type de fichier
- Standards pour ce contexte
- Bonnes pratiques contextuelles

**Rétroaction** :
- Application automatique des conventions
- Vérification de conformité

**Action** :
- Code généré conforme
- Ajustements si nécessaire

**Exemple** :
```
Fichier src/tools/fetchUrl.ts ouvert
→ Règle "typescript-conventions.mdc" active (globs: **/*.ts)
→ L'IA suit automatiquement les conventions TypeScript
→ Code généré conforme
```

### 4. Boucles via Workflows

**Quand** : Exécution d'un workflow

**Détection** :
- Vérifications multi-étapes
- Tests automatiques
- Validations

**Rétroaction** :
- Rapport des problèmes
- Liste des étapes non complétées

**Action** :
- Corriger les problèmes
- Compléter les étapes manquantes

**Exemple** :
```
Workflow "validate-pre-release"
→ Vérifie : branche, versions, build, tests
→ Si problème : Rapport → Corriger → Re-vérifier → ✅
```

### 5. Boucles Manuelles (Tests/Review)

**Quand** : Tests manuels ou review

**Détection** :
- Comportement observé vs attendu
- Problèmes fonctionnels
- Feedback utilisateur

**Rétroaction** :
- Description du problème
- Suggestions d'amélioration

**Action** :
- Ajuster le code
- Retester

---

## 📁 Boucles via les Règles de Projet

### Règles avec `alwaysApply: true`

Ces règles créent des **boucles de rétroaction permanentes** qui s'activent à chaque action pertinente.

#### Exemple 1 : Maintenance du CONTEXT.md

**Règle** : `context-maintenance.mdc` avec `alwaysApply: true`

**Quand** : Avant chaque commit significatif

**Détection** :
- Nouveau tool implémenté → CONTEXT.md doit être mis à jour
- Décision technique importante → CONTEXT.md doit être mis à jour
- Release/version → CONTEXT.md doit être mis à jour

**Rétroaction** :
```
Rappel automatique :
"⚠️ Avant de commit, vérifier que CONTEXT.md est à jour :
- [ ] Nouveau tool → Mettre à jour 'Ce qui est implémenté'
- [ ] Décision technique → Ajouter dans 'Décisions Clés'
- [ ] Release → Ajouter entrée dans 'Changelog'"
```

**Action** :
1. L'IA vérifie CONTEXT.md
2. Si non à jour → Met à jour automatiquement
3. Vérifie à nouveau
4. Continue avec le commit

**Boucle complète** :
```
Commit demandé
    ↓
Règle context-maintenance active
    ↓
CONTEXT.md à jour ?
    ├─→ NON → Mettre à jour → Vérifier → ✅
    └─→ OUI → Continue → ✅
```

#### Exemple 2 : Processus de Release

**Règle** : `release-process.mdc` avec `alwaysApply: true`

**Quand** : Quand l'utilisateur demande une release

**Détection** :
- Version non demandée à l'utilisateur
- Fichiers de version non mis à jour
- CONTEXT.md non mis à jour
- Versions incohérentes

**Rétroaction** :
```
Checklist automatique :
1. ❓ Demander la version (OBLIGATOIRE)
2. ✅ Vérifier branche (doit être develop)
3. ✅ Mettre à jour package.json
4. ✅ Mettre à jour src/servers/http.ts
5. ✅ Mettre à jour CONTEXT.md
6. ✅ Vérifier cohérence
```

**Action** :
1. L'IA suit la checklist étape par étape
2. Si une étape manque → Rappel → Compléter
3. Vérifie la complétude
4. Continue

**Boucle complète** :
```
Release demandée
    ↓
Règle release-process active
    ↓
Version demandée ?
    ├─→ NON → Demander → Attendre réponse → ✅
    └─→ OUI → Continue
    ↓
Tous fichiers version mis à jour ?
    ├─→ NON → Mettre à jour → Vérifier → ✅
    └─→ OUI → Continue
    ↓
CONTEXT.md mis à jour ?
    ├─→ NON → Mettre à jour → Vérifier → ✅
    └─→ OUI → Continue
    ↓
Cohérence vérifiée ?
    ├─→ NON → Corriger → Vérifier → ✅
    └─→ OUI → ✅ Release prête
```

### Règles avec `globs` (Contextuelles)

Ces règles créent des **boucles de rétroaction contextuelles** qui s'activent seulement pour certains fichiers.

#### Exemple 1 : Conventions TypeScript

**Règle** : `typescript-conventions.mdc` avec `globs: ["**/*.ts", "**/*.tsx"]`

**Quand** : Quand un fichier `.ts` ou `.tsx` est ouvert/modifié

**Détection** :
- Nommage non conforme (camelCase, UpperCamelCase)
- Formatage incorrect
- Bonnes pratiques non respectées

**Rétroaction** :
- L'IA applique automatiquement les conventions
- Code généré conforme

**Action** :
1. Fichier TypeScript ouvert
2. Règle active automatiquement
3. L'IA suit les conventions
4. Code généré conforme

**Boucle complète** :
```
Fichier src/tools/newTool.ts ouvert
    ↓
Règle typescript-conventions active (globs match)
    ↓
Code généré
    ↓
Conventions respectées ?
    ├─→ NON → Ajuster → Vérifier → ✅
    └─→ OUI → ✅
```

#### Exemple 2 : Conventions pour les Tools MCP

**Règle** : `openai-apps-sdk-tools.mdc` avec `globs: ["src/tools/**/*.ts"]`

**Quand** : Quand un fichier dans `src/tools/` est ouvert/modifié

**Détection** :
- Checklist tool non complète :
  - [ ] Nom `domain.action`
  - [ ] Description "Use this when..."
  - [ ] `inputSchema` avec descriptions
  - [ ] `annotations` configurées
  - [ ] Validation server-side

**Rétroaction** :
```
Checklist automatique vérifiée :
- ✅ Nom correct
- ❌ Description manquante "Do NOT use for..."
- ✅ inputSchema OK
- ❌ annotations incomplètes
- ✅ Validation OK
```

**Action** :
1. Fichier tool ouvert
2. Règle active automatiquement
3. L'IA vérifie la checklist
4. Corrige les éléments manquants
5. Vérifie à nouveau

**Boucle complète** :
```
Fichier src/tools/newTool.ts ouvert
    ↓
Règle openai-apps-sdk-tools active (globs match)
    ↓
Checklist vérifiée
    ↓
Tous items OK ?
    ├─→ NON → Corriger → Vérifier → ✅
    └─→ OUI → ✅
```

---

## 🔗 Boucles via les Règles Always Applied

### Règles Globales (Workspace)

Ces règles créent des **boucles de rétroaction globales** qui s'appliquent à tous les projets.

#### Exemple : Standards de Développement

**Règle** : `openai-apps-sdk-main.mdc` avec `alwaysApply: true`

**Quand** : Toujours, pour tous les projets MCP

**Détection** :
- Structure des réponses incorrecte
- Annotations manquantes
- `structuredContent` trop volumineux (> 4k tokens)
- Validation server-side manquante

**Rétroaction** :
```
Vérifications automatiques :
- ✅ Structure réponse (content, structuredContent, _meta)
- ❌ Annotations incomplètes (manque openWorldHint)
- ✅ structuredContent < 4k tokens
- ✅ Validation server-side présente
```

**Action** :
1. L'IA vérifie automatiquement ces points
2. Corrige les problèmes
3. Vérifie à nouveau

**Boucle complète** :
```
Création d'une réponse tool
    ↓
Règle openai-apps-sdk-main active (alwaysApply)
    ↓
Standards respectés ?
    ├─→ NON → Corriger → Vérifier → ✅
    └─→ OUI → ✅
```

---

## 🔄 Boucles en Cascade

### Qu'est-ce qu'une Boucle en Cascade ?

Une **boucle en cascade** est une série de boucles de rétroaction qui s'enchaînent, où la sortie d'une boucle déclenche la suivante.

### Exemple Complet : Ajout d'un Tool

```
ÉTAPE 1 : Création du fichier
src/tools/newTool.ts créé
    ↓
ÉTAPE 2 : Boucle 1 - Règle contextuelle (globs)
Règle openai-apps-sdk-tools.mdc active
    ↓
Checklist tool vérifiée
    ├─→ Problème → Corriger → ✅
    └─→ OK → Continue
    ↓
ÉTAPE 3 : Boucle 2 - Règle contextuelle (globs)
Règle typescript-conventions.mdc active
    ↓
Conventions TypeScript vérifiées
    ├─→ Problème → Corriger → ✅
    └─→ OK → Continue
    ↓
ÉTAPE 4 : Boucle 3 - Règle always applied
Règle openai-apps-sdk-main.mdc active
    ↓
Standards généraux vérifiés
    ├─→ Problème → Corriger → ✅
    └─→ OK → Continue
    ↓
ÉTAPE 5 : Boucle 4 - Build
npm run build
    ↓
Erreurs TypeScript ?
    ├─→ OUI → Corriger → Rebuild → ✅
    └─→ NON → Continue
    ↓
ÉTAPE 6 : Boucle 5 - Test
Test manuel avec MCP Inspector
    ↓
Tool fonctionne ?
    ├─→ NON → Analyser → Corriger → Retester → ✅
    └─→ OUI → Continue
    ↓
ÉTAPE 7 : Boucle 6 - Documentation
Commit demandé
    ↓
Règle context-maintenance.mdc active
    ↓
CONTEXT.md à jour ?
    ├─→ NON → Mettre à jour → Vérifier → ✅
    └─→ OUI → Continue
    ↓
ÉTAPE 8 : ✅ Commit OK
```

### Avantages des Boucles en Cascade

1. **Détection précoce** : Problèmes identifiés dès la création
2. **Correction progressive** : Chaque boucle corrige un aspect
3. **Qualité garantie** : Plusieurs niveaux de vérification
4. **Apprentissage** : L'IA apprend les patterns corrects

---

## 📚 Exemples Concrets

### Exemple 1 : Création d'un Tool avec Problèmes Multiples

**Scénario** : Création d'un tool avec plusieurs problèmes

**Boucles activées** :

1. **Boucle 1** - Règle `openai-apps-sdk-tools.mdc` :
   ```
   Problème détecté : Description manque "Do NOT use for..."
   → Correction : Ajouter "Do NOT use for..."
   → Vérification : ✅ Description complète
   ```

2. **Boucle 2** - Règle `openai-apps-sdk-main.mdc` :
   ```
   Problème détecté : Annotations incomplètes (manque openWorldHint)
   → Correction : Ajouter openWorldHint: false
   → Vérification : ✅ Annotations complètes
   ```

3. **Boucle 3** - Build :
   ```
   Problème détecté : Erreur TypeScript (type manquant)
   → Correction : Ajouter le type
   → Vérification : ✅ Build OK
   ```

4. **Boucle 4** - Test :
   ```
   Problème détecté : Tool non visible dans MCP Inspector
   → Correction : Vérifier l'enregistrement dans http.ts
   → Vérification : ✅ Tool visible
   ```

5. **Boucle 5** - Documentation :
   ```
   Problème détecté : CONTEXT.md pas à jour
   → Correction : Ajouter le tool dans "Ce qui est implémenté"
   → Vérification : ✅ CONTEXT.md à jour
   ```

**Résultat** : Tool créé avec tous les problèmes corrigés automatiquement

### Exemple 2 : Release avec Incohérences

**Scénario** : Release demandée avec versions incohérentes

**Boucles activées** :

1. **Boucle 1** - Règle `release-process.mdc` :
   ```
   Étape 1 : Version demandée → ✅ "2.1.0"
   Étape 2 : package.json mis à jour → ✅
   Étape 3 : src/servers/http.ts mis à jour → ✅
   Étape 4 : Vérification cohérence → ❌ README.md badge pas à jour
   → Correction : Mettre à jour badge README.md
   → Vérification : ✅ Toutes versions cohérentes
   ```

2. **Boucle 2** - Règle `context-maintenance.mdc` :
   ```
   CONTEXT.md mis à jour ?
   → NON → Ajouter changelog v2.1.0
   → Vérification : ✅ CONTEXT.md à jour
   ```

3. **Boucle 3** - Workflow `validate-pre-release` :
   ```
   Build OK ? → ✅
   Typecheck OK ? → ✅
   Versions cohérentes ? → ✅
   → ✅ Release prête
   ```

**Résultat** : Release créée avec toutes les incohérences corrigées

---

## ⚙️ Optimisation des Boucles

### Principes d'Optimisation

1. **Détection précoce** : Plus tôt on détecte, moins c'est coûteux
2. **Feedback immédiat** : Correction pendant le développement
3. **Automatisation** : Moins d'intervention manuelle
4. **Cascade efficace** : Boucles qui s'enchaînent logiquement

### Stratégies d'Optimisation

#### 1. Règles avec `globs` pour Détection Précoce

**Avant** : Règle `alwaysApply: true` pour tout
- ✅ Détecte toujours
- ❌ Peut ralentir (vérifie même quand pas nécessaire)

**Après** : Règle avec `globs: ["src/tools/**/*.ts"]`
- ✅ Détecte seulement quand pertinent
- ✅ Plus rapide
- ✅ Plus ciblé

**Exemple** :
```markdown
---
description: Conventions pour les tools
globs: ["src/tools/**/*.ts"]  # Seulement pour les tools
alwaysApply: false
---
```

#### 2. Checklist Hiérarchique

**Stratégie** : Organiser les vérifications par priorité

**Exemple** :
```
Priorité 1 (Critique) :
- [ ] Nom correct
- [ ] Description complète
- [ ] Annotations présentes

Priorité 2 (Important) :
- [ ] Validation server-side
- [ ] Gestion d'erreurs

Priorité 3 (Recommandé) :
- [ ] Documentation
- [ ] Exemples
```

#### 3. Feedback Progressif

**Stratégie** : Donner le feedback étape par étape

**Exemple** :
```
Étape 1 : Vérifier nom → ✅
Étape 2 : Vérifier description → ❌ → Corriger → ✅
Étape 3 : Vérifier annotations → ❌ → Corriger → ✅
```

---

## 🛠️ Créer de Nouvelles Boucles

### Processus de Création

#### 1. Identifier le Problème Récurrent

**Question** : Quel problème se répète souvent ?

**Exemples** :
- Oubli de mettre à jour la documentation
- Versions incohérentes
- Conventions non respectées
- Tests manquants

#### 2. Définir la Détection

**Question** : Comment détecter ce problème ?

**Exemples** :
- Vérifier un fichier existe et est à jour
- Comparer des valeurs dans plusieurs fichiers
- Vérifier la présence d'un pattern
- Exécuter un test

#### 3. Créer la Règle

**Format** :
```markdown
---
description: Description de la règle
globs: ["**/*.ts"]  # Optionnel : fichiers concernés
alwaysApply: true   # Optionnel : toujours appliquer
---

# Titre de la Règle

## Détection

Comment détecter le problème...

## Rétroaction

Quel feedback donner...

## Action

Quelle correction appliquer...
```

#### 4. Tester la Boucle

**Étapes** :
1. Créer un cas de test (problème intentionnel)
2. Vérifier que la règle détecte
3. Vérifier que le feedback est clair
4. Vérifier que la correction fonctionne
5. Itérer si nécessaire

### Exemple : Création d'une Boucle pour les Tests

**Problème** : Tests manquants pour les nouveaux tools

**Règle créée** : `test-coverage.mdc`

```markdown
---
description: Vérification de la couverture de tests
globs: ["src/tools/**/*.ts"]
alwaysApply: false
---

# Test Coverage - Règles de Rétroaction

## Détection

Quand un fichier tool est créé :
1. Vérifier si un fichier de test correspondant existe
2. Vérifier si les tests couvrent les cas principaux

## Rétroaction

Si test manquant :
```
⚠️ Aucun test trouvé pour src/tools/newTool.ts
→ Créer src/tools/__tests__/newTool.test.ts
```

## Action

1. Créer le fichier de test
2. Ajouter les tests de base
3. Vérifier que les tests passent
```

**Boucle créée** :
```
Fichier tool créé
    ↓
Règle test-coverage active
    ↓
Test existe ?
    ├─→ NON → Créer test → Vérifier → ✅
    └─→ OUI → Vérifier couverture → ✅
```

---

## 📊 Tableau Récapitulatif

| Type de Boucle | Quand | Détection | Rétroaction | Action |
|----------------|-------|-----------|-------------|--------|
| **Build/Compilation** | Build | Erreurs TypeScript | Messages erreur | Corriger |
| **Règle alwaysApply** | Toujours | Checklist | Rappel/Alerte | Suivre checklist |
| **Règle globs** | Fichier ouvert | Conventions | Application auto | Code conforme |
| **Workflow** | Exécution | Vérifications | Rapport | Corriger |
| **Test manuel** | Test | Comportement | Feedback | Ajuster |

---

## 🎯 Bonnes Pratiques

### 1. Boucles Précoces

✅ **Bien** : Détecter dès la création du fichier
```markdown
globs: ["src/tools/**/*.ts"]  # Détecte dès la création
```

❌ **Éviter** : Détecter seulement au commit
```markdown
# Trop tard, problème déjà propagé
```

### 2. Feedback Clair

✅ **Bien** : Feedback spécifique avec action
```
❌ Description incomplète
→ Ajouter "Do NOT use for..." à la description
```

❌ **Éviter** : Feedback vague
```
❌ Problème détecté
```

### 3. Correction Automatique

✅ **Bien** : L'IA corrige automatiquement quand possible
```
Problème : CONTEXT.md pas à jour
→ Action : Mettre à jour automatiquement
```

❌ **Éviter** : Demander à l'utilisateur pour tout
```
Problème : CONTEXT.md pas à jour
→ Action : Demander à l'utilisateur de mettre à jour
```

### 4. Cascade Logique

✅ **Bien** : Boucles qui s'enchaînent logiquement
```
1. Conventions code → 2. Build → 3. Test → 4. Documentation
```

❌ **Éviter** : Boucles qui se chevauchent
```
1. Build → 2. Conventions (déjà vérifié en 1)
```

---

## 🔍 Dépannage

### Problème : Boucle ne s'active pas

**Causes possibles** :
1. `globs` ne correspond pas au fichier
2. `alwaysApply: true` manquant si nécessaire
3. Règle mal formatée

**Solution** :
1. Vérifier le pattern `globs`
2. Vérifier le frontmatter YAML
3. Tester avec un fichier simple

### Problème : Boucle trop agressive

**Causes possibles** :
1. `alwaysApply: true` sur une règle non critique
2. Vérifications trop fréquentes

**Solution** :
1. Utiliser `globs` au lieu de `alwaysApply`
2. Réduire la fréquence des vérifications

### Problème : Feedback pas clair

**Causes possibles** :
1. Message trop vague
2. Pas d'action suggérée

**Solution** :
1. Messages spécifiques avec exemples
2. Toujours suggérer une action

---

## 📝 Conclusion

Les **boucles de rétroaction via les règles** sont un mécanisme puissant pour :
- ✅ Détecter les problèmes tôt
- ✅ Maintenir la qualité du code
- ✅ Automatiser les vérifications
- ✅ Guider l'IA vers les bonnes pratiques

**Clés du succès** :
1. **Détection précoce** : Règles avec `globs` pour cibler
2. **Feedback clair** : Messages spécifiques avec actions
3. **Correction automatique** : L'IA corrige quand possible
4. **Cascade logique** : Boucles qui s'enchaînent bien

**Prochaines étapes** :
1. Identifier les problèmes récurrents dans votre projet
2. Créer des règles avec boucles de rétroaction
3. Tester et itérer
4. Documenter les boucles créées

---

**Document maintenu par** : AI Assistant (Claude)  
**Pour** : Jessy Bonnotte (@rankorr)  
**Dernière mise à jour** : 2025-01-27


