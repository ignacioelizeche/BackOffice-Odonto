# Docker Setup Guide

Esta guía explica cómo correr la aplicación BackOffice Odonto usando Docker.

## Requisitos Previos

- Docker Desktop instalado (https://www.docker.com/products/docker-desktop)
- Docker Compose (incluido en Docker Desktop)
- Git

## Estructura de Contenedores

```
┌─────────────────────────────────────┐
│    Docker Network: backoffice_network │
├─────────────────────────────────────┤
│                                       │
│  ┌─────────────┐   ┌─────────────┐  │
│  │  Frontend   │   │   Backend   │  │
│  │   (3000)    │   │   (8000)    │  │
│  └──────┬──────┘   └──────┬──────┘  │
│         │                 │           │
│         └────────┬────────┘           │
│                  │                    │
│          ┌───────▼────────┐           │
│          │   PostgreSQL   │           │
│          │   Database     │           │
│          │   (5432)       │           │
│          └────────────────┘           │
└─────────────────────────────────────┘
```

## Inicio Rápido

### Opción 1: Usar el script automatizado (Recomendado)

```bash
./scripts/docker-start.sh
```

Este script:
- Verifica que Docker está instalado
- Crea el archivo .env.local si no existe
- Inicia todos los contenedores
- Espera a que los servicios estén listos

### Opción 2: Comandos manuales

```bash
# 1. Copiar configuración de ejemplo
cp .env.example .env.local

# 2. Construir las imágenes (primera vez)
docker-compose build

# 3. Iniciar los servicios
docker-compose up -d

# 4. Verificar que todo está corriendo
docker-compose ps
```

## Acceso a la Aplicación

Una vez que los contenedores están corriendo:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432

## Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo database
docker-compose logs -f db
```

### Detener servicios
```bash
# Parar todos los contenedores
docker-compose down

# Parar y eliminar volúmenes (limpia la BD)
docker-compose down -v
```

### Reconstruir imágenes
```bash
# Reconstruir sin caché
docker-compose build --no-cache

# Reconstruir e iniciar
docker-compose up -d --build
```

### Ejecutar comandos dentro de contenedores
```bash
# Acceder a terminal del backend
docker-compose exec backend bash

# Ejecutar migración de BD
docker-compose exec backend alembic upgrade head

# Acceder a PostgreSQL
docker-compose exec db psql -U postgres -d backoffice_odonto
```

## Variables de Entorno

Las variables de entorno se cargan desde `.env.local`. Las más importantes son:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_DB` | Nombre de la base de datos | `backoffice_odonto` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `ENVIRONMENT` | Modo (development/production) | `development` |
| `CORS_ORIGINS` | Orígenes CORS permitidos | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | URL de la API para el frontend | `http://localhost:8000` |

## Desarrollo Local

### Backend (FastAPI)

El código del backend está montado como volumen, así que los cambios se reflejan automáticamente (con `--reload`):

```bash
# Ver cambios en tiempo real
docker-compose logs -f backend
```

### Frontend (Next.js)

El código del frontend también está montado como volumen:

```bash
# Los cambios se recompilan automáticamente
docker-compose logs -f frontend
```

## Problemas Comunes

### Puerto 5432 ya está en uso
```bash
# Liberar el puerto
lsof -ti:5432 | xargs kill -9

# O cambiar el puerto en .env.local
DB_PORT=5433
```

### Puerto 3000 o 8000 en uso
```bash
# Cambiar en docker-compose.yml o en .env.local
```

### Base de datos no responde
```bash
# Reiniciar la BD
docker-compose restart db

# O limpiar y reconstruir
docker-compose down -v
docker-compose up -d
```

### Imagen no se construyó correctamente
```bash
# Reconstruir sin caché
docker-compose build --no-cache backend
docker-compose build --no-cache frontend
```

## Verificar que todo funciona

```bash
# Verificar servicios corriendo
docker-compose ps

# Probar API
curl http://localhost:8000/docs

# Probar Frontend
curl http://localhost:3000
```

## Para Producción

Para usar en producción, usar `Dockerfile.prod` en lugar del development Dockerfile:

```bash
# Actualizar docker-compose.yml
# dockerfile: Dockerfile.prod
docker-compose -f docker-compose.prod.yml up -d
```

## Limpiar Todo

```bash
# Detener y eliminar todo (contenedores, volúmenes, redes)
docker-compose down -v

# Eliminar imágenes también
docker-compose down -v --rmi all
```
