# Production Deployment Guide

## 🚀 Usando docker-compose.prod.yml

La configuración de producción está optimizada para seguridad, performance y estabilidad.

### Diferencias con Development

| Aspecto | Dev | Prod |
|---------|-----|------|
| Backend | Uvicorn + reload | Gunicorn (4 workers) |
| Logs | Console | JSON files (10MB max) |
| Puertos | Expostos | Solo reverse proxy |
| Memoria | No limitado | Limitado por servicio |
| Restart | unless-stopped | always |
| SSL | No | Let's Encrypt (certbot) |
| CORS | Abierto | Restringido |
| DB Backups | No | Automático (Phase 6) |

### Deploy en Producción

#### 1. Configurar servidor
```bash
# En tu VPS/servidor
sudo apt update
sudo apt install docker.io docker-compose certbot

# Clonar repo
git clone https://github.com/tu-usuario/BackOffice-Odonto.git
cd BackOffice-Odonto
```

#### 2. Configurar .env.production.local
```bash
cp .env.example .env.production.local
nano .env.production.local
```

Valores importantes:
```env
# Database
DB_USER=odonto_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# Backend Security
SECRET_KEY=VERY_LONG_RANDOM_KEY_MIN_32_CHARS
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

#### 3. Setup SSL (Let's Encrypt)
```bash
./scripts/setup-ssl.sh
# O manualmente:
mkdir -p certbot/conf certbot/www
docker run --rm -it \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
    -w /var/www/certbot \
    -d yourdomain.com \
    -d api.yourdomain.com \
    -m admin@yourdomain.com \
    --agree-tos
```

#### 4. Iniciar servicios
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. Verificar health
```bash
# Esperar 30 segundos
sleep 30

# Verificar endpoints
curl https://yourdomain.com
curl https://api.yourdomain.com/health

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### 6. Backup automático de BD (opcional en Phase 6)
```bash
# Agregar cron job
0 2 * * * /opt/backoffice/scripts/backup_db.sh
```

### Monitoreo

Ver **Phase 7** (Monitoring) en el plan para ELK Stack y Prometheus/Grafana.

Por ahora, monitoreo básico:
```bash
# Ver estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f backend

# Acceder a base de datos
docker-compose -f docker-compose.prod.yml exec db psql -U $DB_USER -d $POSTGRES_DB
```

### Renovación de SSL

Let's Encrypt certificados expiran en 90 días. Configurar renovación automática:

```bash
# Crear script renew-ssl.sh
#!/bin/bash
docker run --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  certbot/certbot renew --webroot -w /var/www/certbot

# Recargar nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Agregar a crontab
# 0 3 * * * /opt/backoffice/scripts/renew-ssl.sh
```

### Variables de Límite de Recursos

Si necesitas ajustar memoria:

```yaml
# En docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 512M    # Máximo
    reservations:
      memory: 256M    # Reservado
```

### Logs

Logs están en archivos JSON con rotación:
```bash
# Ver logs comprimidos
docker logs --tail 100 backoffice_api_prod

# Guardar logs
docker logs backoffice_api_prod > api.log 2>&1
```

---

**Next: Phase 5 - CI/CD Pipeline** →
