# Multi-stage build pour optimiser la taille de l'image
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (sans exécuter prepare qui essaie de build)
RUN npm ci --ignore-scripts

# Copier le code source
COPY . .

# Build du projet maintenant que le code est là
RUN npm run build

# Stage production - Image finale minimale
FROM node:20-alpine

WORKDIR /app

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production (sans exécuter les scripts de build)
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist ./dist

# Exposer le port de l'application
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck pour Docker/Traefik
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Utilisateur non-root pour la sécurité
USER node

# Démarrer le serveur HTTP
CMD ["node", "dist/http-server.js"]

