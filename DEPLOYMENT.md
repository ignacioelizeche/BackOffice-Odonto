# Deployment en agilapps.com/agildent

## Configuración de Nginx

Se ha creado la configuración de Nginx en `nginx/nginx.conf` que:

- ✅ Escucha en puertos 80 (HTTP) y 443 (HTTPS)
- ✅ Hace reverse proxy del frontend (Next.js) en `http://frontend:3000`
- ✅ Hace reverse proxy del backend (FastAPI) en `http://backend:8000`
- ✅ Publica la aplicación en `https://agilapps.com/agildent`
- ✅ Redirecciona HTTP → HTTPS
- ✅ Soporta Let's Encrypt SSL certificates
- ✅ Headers de seguridad configurados

## Rutas disponibles después del deployment

```
https://agilapps.com/agildent/           → Frontend (Next.js)
https://agilapps.com/agildent/api/*      → Backend (FastAPI)
https://agilapps.com/health              → Health check
```

## Pasos para publicar en Portainer

### 1. Preparar variables de entorno

Edita `.env.prod` y configura:

```env
DB_PASSWORD=tu_password_seguro
SECRET_KEY=generar_con: python -c "import secrets; print(secrets.token_urlsafe(64))"
N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=tu_n8n_webhook
```

Para generar `SECRET_KEY` seguro:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. En Portainer

1. **Stack** → **Add stack** (o actualiza el existente)
2. **Build and deploy**
3. En **Environment variables**, copia el contenido de `.env.prod`

### 3. Puertos a publicar

**Solo estos dos puertos necesitan estar expuestos:**
- `80:80` → HTTP (Let's Encrypt y redirección a HTTPS)
- `443:443` → HTTPS (tráfico seguro)

Backend (8000) y Frontend (3000) **NO se exponen** externamente.

### 4. Certificados SSL (Let's Encrypt)

#### Primera vez:
```bash
# En el servidor donde hagas deploy
mkdir -p certbot/conf certbot/www

# Obtener certificado inicial
docker run --rm -it \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d agilapps.com -d www.agilapps.com
```

#### Renovación automática:
Añade a crontab:
```
0 0 * * * docker run --rm \
  -v /path/to/certbot/conf:/etc/letsencrypt \
  -v /path/to/certbot/www:/var/www/certbot \
  -p 80:80 -p 443:443 \
  certbot/certbot renew --quiet
```

### 5. Archivos necesarios

```
BackOffice_Odonto/
├── nginx/
│   └── nginx.conf          ← ✅ Ya creado
├── certbot/
│   ├── conf/               ← Para SSL certificates
│   └── www/                ← Para validación Let's Encrypt
├── docker-compose.prod.yml ← ✅ Ya existe
├── .env.prod              ← ✅ Ya creado
├── backend/
│   ├── Dockerfile.prod
│   └── main.py
└── frontend/
    └── dental-back-office/
        └── Dockerfile
```

## Verificar que funciona

Después del deployment:

```bash
# Verificar frontend
curl https://agilapps.com/agildent/

# Verificar backend
curl https://agilapps.com/agildent/api/health

# Ver logs
docker logs backoffice_nginx_prod
docker logs backoffice_api_prod
docker logs backoffice_frontend_prod
```

## Troubleshooting

### Error: "Could not import module main"
✅ Solucionado - Lee el archivo memory/MEMORY.md

### Nginx: 502 Bad Gateway
```bash
# Verifica que backend/frontend estén corriendo
docker ps | grep backoffice

# Verifica logs del nginx
docker logs backoffice_nginx_prod
```

### SSL Certificate errors
- Asegúrate de que el puerto 80 está abierto para validación de Let's Encrypt
- Verifica que `certbot/conf` existe con los certificates

### Frontend no carga en /agildent
- Verifica que `NEXT_PUBLIC_API_URL=https://agilapps.com/agildent/api` en `.env.prod`
- Clearea el cache del navegador (Ctrl+Shift+Delete)

## Cambios hechos

1. ✅ Creado `nginx/nginx.conf` - configuración completa de reverse proxy
2. ✅ Creado `.env.prod` - variables de entorno para producción
3. ✅ Configurado para apuntar a `agilapps.com/agildent`
4. ✅ SSL/TLS automático con Let's Encrypt
5. ✅ Headers de seguridad
6. ✅ WebSocket support para tiempo real
