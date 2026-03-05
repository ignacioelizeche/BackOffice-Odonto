"""
Prometheus metrics collection for FastAPI
Expone métricas en /metrics para Prometheus scrape
"""

from prometheus_client import Counter, Histogram, Gauge, REGISTRY
from prometheus_client.exposition import generate_latest
from fastapi import Request
from typing import Callable
import time

# Métricas de requests HTTP
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0)
)

# Métricas de base de datos
db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)

db_connections_active = Gauge(
    'db_connections_active',
    'Active database connections'
)

db_query_errors_total = Counter(
    'db_query_errors_total',
    'Total database query errors',
    ['operation', 'table']
)

# Métricas de autenticación
auth_login_attempts_total = Counter(
    'auth_login_attempts_total',
    'Total login attempts',
    ['status']  # success, failure, invalid_credentials
)

auth_token_issued_total = Counter(
    'auth_token_issued_total',
    'Total JWT tokens issued',
    ['user_role']
)

# Métricas de notificaciones
notifications_created_total = Counter(
    'notifications_created_total',
    'Total notifications created',
    ['type']
)

notifications_sent_total = Counter(
    'notifications_sent_total',
    'Total notifications sent',
    ['type', 'status']
)

# Métricas de citas
appointments_total = Counter(
    'appointments_total',
    'Total appointments',
    ['status']
)

appointments_duration_seconds = Histogram(
    'appointments_duration_seconds',
    'Appointment duration',
    buckets=(5*60, 15*60, 30*60, 45*60, 60*60, 90*60, 120*60)
)


async def prometheus_middleware(request: Request, call_next: Callable):
    """
    Middleware para capturar métricas de requests
    """
    method = request.method
    endpoint = request.url.path

    start_time = time.time()

    try:
        response = await call_next(request)
        status = response.status_code
    except Exception as e:
        status = 500
        raise
    finally:
        duration = time.time() - start_time

        # Registrar métrica
        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=status
        ).inc()

        http_request_duration_seconds.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

    return response


def get_metrics():
    """
    Endpoint para scraping de Prometheus
    Retorna todas las métricas en formato Prometheus
    """
    return generate_latest(REGISTRY)
