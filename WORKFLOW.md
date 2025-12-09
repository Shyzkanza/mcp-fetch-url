# Workflow de Développement et Release

## Schéma du Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DÉVELOPPEMENT CONTINU                      │
│                                                               │
│  develop ──────► [commits] ──────► [commits] ──────► ...    │
│     │                                                         │
│     │  (développement normal, tous les commits ici)          │
│     │                                                         │
└─────┼─────────────────────────────────────────────────────────┘
      │
      │  🔄 "On veut faire une release"
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    CRÉATION DE LA MR                         │
│                                                               │
│  1. Demander la version à l'utilisateur                     │
│  2. Créer MR : develop → main                                │
│     Titre : "Release X.Y.Z" (ex: "Release 2.1.0")          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      │
      │  ✅ MR validée par l'utilisateur
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    MERGE DANS MAIN                            │
│                                                               │
│  main ◄─────── merge/squash ─────── develop                  │
│                                                               │
│  - Merge ou squash selon choix                               │
│  - Créer tag X.Y.Z                                           │
│  - Push main + tag                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      │
      │  🔄 Synchronisation
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│              MERGE MAIN → DEVELOP                            │
│                                                               │
│  develop ◄─────── merge normal ─────── main                  │
│                                                               │
│  - Merge normal (sans squash)                                │
│  - Push develop                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
      │
      │  🔄 Retour au développement
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    DÉVELOPPEMENT CONTINU                      │
│                                                               │
│  develop ──────► [commits] ──────► [commits] ──────► ...    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Étapes Détaillées

### 1. Développement Normal
- ✅ Tous les commits se font sur `develop`
- ✅ Pas de commit direct sur `main`
- ✅ Développement continu sans interruption

### 2. Décision de Release
- 🔄 L'utilisateur décide de faire une release
- ❓ **L'IA DOIT demander la version** (ex: "Quelle version voulez-vous faire ? 2.1.0 ?")
- ✅ Confirmation de la version
- ✅ **Mettre à jour TOUS les fichiers** contenant la version :
  - `package.json`
  - `src/servers/http.ts` (toutes les occurrences)
  - `src/http-client.ts` (si présent)
  - `src/servers/stdio.ts` (si présent)
  - `README.md` (badge version - ligne 6)
  - `CONTEXT.md` (changelog avec nouvelle version)

### 3. Création de la MR
- 📝 Créer une Merge Request `develop` → `main`
- 📝 **Titre OBLIGATOIRE** : `Release X.Y.Z` (ex: `Release 2.1.0`)
- 📝 Description : résumé des changements (optionnel mais recommandé)

### 4. Validation et Merge
- ✅ L'utilisateur valide la MR
- 🔀 Merge ou squash dans `main` (selon choix)
- 🏷️ Créer tag `X.Y.Z` (sans "v")
- 📤 Push `main` + tag

### 5. Synchronisation
- 🔄 Merge normal `main` → `develop` (sans squash)
- 📤 Push `develop`
- ✅ Retour au développement normal

## Règles Importantes

1. ✅ **Toujours demander la version** avant de créer une MR
2. ✅ **Titre MR = "Release X.Y.Z"** (format strict)
3. ✅ **Tag = X.Y.Z** (sans "v", correspond à package.json)
4. ✅ **Pas de release automatique** : uniquement quand demandé
5. ✅ **Merge normal** pour `main` → `develop` (sans squash)

## Commandes Utiles

```bash
# Vérifier la version actuelle
grep '"version"' package.json

# Vérifier sur quelle branche on est
git branch --show-current

# Voir les tags existants
git tag -l
```

