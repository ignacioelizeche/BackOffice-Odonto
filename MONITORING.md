# Phase 7: Monitoring, Logging & Observability

Sistema completo de monitoreo para BackOffice Odonto usando **ELK Stack** (Elasticsearch, Logstash, Kibana) y **Prometheus + Grafana**.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│             BackOffice Services                 │
│  (Backend FastAPI + Frontend + Database)        │
└────┬──────────────────────────────────────────┬─┘
     │                                          │
     │ JSON Logs (UDP 5000)                    │ Metrics (HTTP /metrics)
     │                                          │
     ▼                                          ▼
┌──────────────┐                        ┌──────────────┐
│  Logstash    │                        │ Prometheus   │
│  (Port 5000) │                        │ (Port 9090)  │
└──────┬───────┘                        └──────┬───────┘
       │                                       │
       ▼                                       ▼
┌──────────────────────┐            ┌──────────────────┐
│  Elasticsearch       │            │  Alertmanager    │
│  (Port 9200)         │            │  (Port 9093)     │
└──────┬───────────────┘            └──────┬───────────┘
       │                                   │
       └─────────────┬────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
    ┌────────────┐          ┌────────────┐
    │  Kibana    │          │  Grafana   │
    │ (5601)     │          │  (3001)    │
    └────────────┘          └────────────┘
```

## 🚀 Iniciar Monitoring Stack

### Con Docker Compose

```bash
cd monitoring
docker-compose up -d

# Verificar servicios
docker-compose ps
```

### Acceso a herramientas

| Herramienta | URL | Usuario | Contraseña |
|------------|-----|---------|-----------|
| Kibana | http://localhost:5601 | elastic | (sin contraseña) |
| Grafana | http://localhost:3001 | admin | admin123 |
| Prometheus | http://localhost:9090 | - | - |
| Alertmanager | http://localhost:9093 | - | - |

## 📊 ELK Stack - Logs & Analytics

### Kibana - Visualización de Logs

**Acceso:** http://localhost:5601

#### Primeros pasos:

1. **Crear Index Pattern**
   - Stack Management → Index Patterns
   - Crear patrón: `logs-*`
   - Timestamp field: `@timestamp`

2. **Ver Logs**
   - Discover → Seleccionar índice `logs-*`
   - Buscar logs en tiempo real

3. **Queries útiles**
   ```
   # Errors en backend
   log_level: "ERROR"

   # Logs de un usuario específico
   user_id: 42

   # Requests lentos
   http_request_duration_seconds: > 1

   # Citas creadas hoy
   service: "appointments" AND @timestamp: [now-1d TO now]
   ```

4. **Crear Dashboard**
   - Dashboard → Create visualization
   - Visualizar: errores por hora, logs por servicio, etc.

### Logstash Configuration

Archivo: `/monitoring/logstash/logstash.conf`

- Recibe logs JSON en UDP/TCP puerto 5000
- Los procesa y enriquece
- Los envía a Elasticsearch con índice `logs-YYYY.MM.dd`

**Para enviar logs desde backend:**
```python
# En app/main.py o cualquier router
from app.logging_config import setup_logging

logger = logging.getLogger(__name__)
logger.info("Mi evento", extra={
    "request_id": "abc123",
    "user_id": 42,
    "service": "appointments"
})
```

## 📈 Prometheus + Grafana - Métricas

### Prometheus - Colección de Métrica

**Acceso:** http://localhost:9090

#### Métricas disponibles:

```
# HTTP Requests
http_requests_total{method, endpoint, status}
http_request_duration_seconds{method, endpoint}

# Database
db_query_duration_seconds{operation, table}
db_connections_active
db_query_errors_total{operation, table}

# Authentication
auth_login_attempts_total{status}
auth_token_issued_total{user_role}

# Notifications
notifications_created_total{type}
notifications_sent_total{type, status}

# Appointments
appointments_total{status}
appointments_duration_seconds
```

#### Queries PromQL:

```promql
# Request rate por segundo
rate(http_requests_total[5m])

# P95 latencia
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Conexiones DB activas
db_connections_active

# Uptime
up{job="backoffice-backend"}
```

### Grafana - Dashboards

**Acceso:** http://localhost:3001 (admin / admin123)

#### Setup Datasources:

1. Configuration → Data Sources
2. Agregar Prometheus
   - URL: `http://prometheus:9090`
3. Agregar Elasticsearch
   - URL: `http://elasticsearch:9200`

#### Dashboards recomendados:

**1. API Performance Dashboard**
- Request rate (RPS)
- Response time (p50, p95, p99)
- Error rate
- Top endpoints más lentos

**2. System Health Dashboard**
- CPU usage
- Memory usage
- Disk space
- Network I/O

**3. Database Dashboard**
- Active connections
- Query duration
- Query errors
- Slow queries

**4. Business Metrics Dashboard**
- Citas creadas/completadas
- Pacientes nuevos
- Doctores activos
- Notificaciones enviadas

## 🚨 Alertas - AlertManager

**Config:** `/monitoring/alertmanager/alertmanager.yml`

### Alertas predefinidas:

| Alerta | Condición | Acción |
|--------|-----------|--------|
| API Down | `up{job="backend"} == 0` por 2 min | Critical |
| High Error Rate | Errores > 5% en 5 min | Warning |
| High Response Time | p95 latencia > 1s en 5 min | Warning |
| DB Connections High | Conexiones > 80 en 5 min | Warning |
| Disk Space Low | < 10% libre en 5 min | Warning |
| High Memory | > 85% en 5 min | Warning |
| High CPU | > 80% en 10 min | Warning |

### Configurar notificaciones:

Editar `/monitoring/alertmanager/alertmanager.yml`:

**Slack:**
```yaml
receivers:
  - name: 'critical'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '🚨 {{ .GroupLabels.alertname }}'
```

**Email:**
```yaml
receivers:
  - name: 'critical'
    email_configs:
      - to: 'ops@yourdomain.com'
        from: 'alertmanager@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

Luego recargar Alertmanager:
```bash
docker-compose exec alertmanager kill -HUP 1
```

## 📝 Logging Best Practices

### 1. Structured Logging

✅ **BUENO:**
```python
logger.info("User logged in", extra={
    "user_id": 42,
    "ip_address": "192.168.1.1",
    "request_id": "abc123"
})
```

❌ **MALO:**
```python
logger.info(f"User {user_id} logged in from {ip}")
```

### 2. Log Levels

- **DEBUG** - Debugging solo en desarrollo
- **INFO** - Eventos importantes (login, cita creada)
- **WARNING** - Cosas inusuales pero que funcionan
- **ERROR** - Errores que necesitan atención
- **CRITICAL** - Sistema completamente roto

### 3. Performance

- No loguear datos sensibles (passwords, tokens)
- Use sampling para logs de alto volumen
- Añada request_id a requests para traceo distribuido

## 📊 Dashboards en Grafana

### Crear Dashboard personalizado:

1. + → Dashboard
2. Add new panel
3. Seleccionar métrica:
   ```promql
   rate(http_requests_total[5m])
   ```
4. Panel title: "Request Rate"
5. Visualización: Graph
6. Save

## 🔍 Troubleshooting

### Elasticsearch no arranca
```bash
# Aumentar vm.max_map_count
sysctl -w vm.max_map_count=262144

# Permanentemente:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### Logs no aparecen en Kibana
```bash
# Verificar Logstash
docker-compose logs logstash

# Enviar log de prueba
echo 'test' | nc -w1 -u localhost 5000
```

### Grafana sin datos
- Verificar Data Source en Configuration → Data Sources
- Verificar que Prometheus está arriba: http://prometheus:9090

### AlertManager no manda notificaciones
- Verificar config: `/monitoring/alertmanager/alertmanager.yml`
- Ver logs: `docker-compose logs alertmanager`
- Verificar URL de Slack/Email

## 📋 Mantenimiento

### Rotación de logs en Elasticsearch

Por defecto, los índices tienen patrón `logs-YYYY.MM.dd` y se crean automáticamente.

Para limpiar logs viejos (> 30 días):

```bash
# Eliminar índices antiguos
curl -X DELETE "localhost:9200/logs-2024.01.*"
```

O usar Life cycle management en Kibana:
1. Stack Management → Index Lifecycle Policies
2. Crear policy con edad máxima

### Backup de Grafana

```bash
docker cp monitoring_grafana:/var/lib/grafana ./grafana-backup
```

## 📚 Recursos Adicionales

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Elasticsearch Docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana Docs](https://www.elastic.co/guide/en/kibana/current/index.html)

---

**Estas herramientas son opcionales pero ALTAMENTE RECOMENDADAS para producción** 🚀
