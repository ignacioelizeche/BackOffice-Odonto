# 📊 Monitoring Stack - Phase 7

Solución completa de observabilidad para BackOffice Odonto.

## 🏗️ Componentes

### ELK Stack
- **Elasticsearch** (9200) - Base de datos y engine de búsqueda para logs
- **Logstash** (5000) - Procesamiento y enriquecimiento de logs
- **Kibana** (5601) - Visualización y análisis de logs

### Prometheus Stack
- **Prometheus** (9090) - Servidor de métricas
- **Grafana** (3001) - Dashboards y visualizaciones
- **AlertManager** (9093) - Gestión de alertas

## 🚀 Quick Start

```bash
# Iniciar con script automatizado
./scripts/monitoring-start.sh

# O manualmente
cd monitoring
docker-compose up -d
```

## 📊 Herramientas

### Kibana - Análisis de Logs
**URL:** http://localhost:5601

- Buscar y filtrar logs en tiempo real
- Crear visualizaciones
- Dashboards personalizados
- Alertas

### Grafana - Métricas y Dashboards
**URL:** http://localhost:3001 (admin/admin123)

- Dashboards predefinidos
- Alertas en tiempo real
- Multi-datasource (Prometheus + Elasticsearch)

### Prometheus - Recolección de Métricas
**URL:** http://localhost:9090

- PromQL queries
- Targets y health checks
- Graphs

### AlertManager - Alertas
**URL:** http://localhost:9093

- Gestión de alertas
- Rutas y notificaciones
- Slack/Email/Webhook

## 📖 Documentación

Ver archivo principal: **[../MONITORING.md](../MONITORING.md)**

Incluye:
- Setup detallado
- Queries PromQL
- Creación de dashboards
- Datos de logs en Kibana
- Troubleshooting
- Best practices

## 🔗 Datasources

Automáticamente configurados:
- Prometheus: `http://prometheus:9090`
- Elasticsearch: `http://elasticsearch:9200`

## 📁 Estructura

```
monitoring/
├── docker-compose.yml           # Stack de servicios
├── prometheus/
│   ├── prometheus.yml          # Configuración
│   └── alert_rules.yml         # Reglas de alertas
├── alertmanager/
│   └── alertmanager.yml        # Configuración de alertas
├── logstash/
│   └── logstash.conf           # Procesamiento de logs
└── grafana/
    └── provisioning/
        ├── datasources/        # Datasources automáticas
        └── dashboards/         # Dashboards predefinidos
```

## 🔄 Flujo de Datos

```
Backend Logs (JSON)
    ↓ (UDP 5000)
Logstash (procesa)
    ↓
Elasticsearch (almacena)
    ↓
Kibana (visualiza)

Backend Métricas (/metrics)
    ↓
Prometheus (scrape cada 15s)
    ↓
Alertmanager (evalúa reglas)
    ↓
Grafana/Slack/Email (notifica)
```

## 🚨 Alertas Incluidas

- ✗ API Down
- ⚠️ High Error Rate
- ⚠️ High Response Time
- ⚠️ Database Connections High
- ⚠️ Disk Space Low
- ⚠️ Memory Usage High
- ⚠️ CPU Usage High

## 📝 Métricas Disponibles

### HTTP
- `http_requests_total` - Total de requests
- `http_request_duration_seconds` - Latencia

### Database
- `db_query_duration_seconds` - Query time
- `db_connections_active` - Conexiones activas
- `db_query_errors_total` - Errores

### Autenticación
- `auth_login_attempts_total` - Intentos de login
- `auth_token_issued_total` - Tokens emitidos

### Negocio
- `appointments_total` - Citas
- `notifications_created_total` - Notificaciones
- `notifications_sent_total` - Enviadas

## 🛠️ Mantenimiento

```bash
# Ver logs
docker-compose logs -f

# Reiniciar servicio
docker-compose restart elasticsearch

# Parar stack
docker-compose down

# Limpiar todo (volúmenes incluidos)
docker-compose down -v
```

## 💾 Requisitos de Espacio

- Elasticsearch: ~1GB por día de logs
- Prometheus: ~500MB
- Grafana: ~100MB

Recomendado: 50GB para 3-6 meses de datos

## 🔐 Seguridad

- Elasticsearch sin auth (local only)
- Cambiar contraseña de Grafana en producción
- Agregar autenticación a Kibana/Prometheus

## 🚀 Producción

Para producción:
1. Habilitar SSL/TLS
2. Agregar autenticación (LDAP/OIDC)
3. Configurar backup de Elasticsearch
4. Escalar a múltiples nodos
5. Usar alertmanager para notificaciones

---

**Next:** [Phase 5 - CI/CD Pipeline](../DEPLOYMENT.md)
