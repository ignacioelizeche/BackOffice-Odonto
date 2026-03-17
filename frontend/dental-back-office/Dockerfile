# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Accept build arguments for API URL and BASE_PATH
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ARG BASE_PATH=/agildent
ARG NEXT_PUBLIC_BASE_PATH=/agildent

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV BASE_PATH=${BASE_PATH}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# Copiar archivos de configuración primero
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.mjs ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Build with environment variables
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV BASE_PATH=/agildent

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copiar resultados del build Y el next.config.mjs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/agildent/ || exit 1

CMD ["npm", "start"]
