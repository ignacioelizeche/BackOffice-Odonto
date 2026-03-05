# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copiar archivos de configuración primero
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.mjs ./

# Instalar dependencias
RUN npm install

# Copiar código fuente (solo lo que existe)
COPY . .

# Build
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copiar resultados del build
COPY --from=builder /app/.next ./.next

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
