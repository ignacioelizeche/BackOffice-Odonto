#!/bin/bash

# Script para iniciar el stack de monitoring (ELK + Prometheus + Grafana)

set -e

echo "🔍 BackOffice Odonto - Monitoring Stack"
echo "========================================"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

cd "$(dirname "$0")/monitoring" || exit 1

echo "📊 Iniciando servicios de monitoreo..."
docker-compose up -d

echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

echo ""
echo "✅ Stack de monitoring iniciado!"
echo ""
echo "================================================"
echo "📌 Accede a las herramientas:"
echo ""
echo "🔍 Kibana (Logs)"
echo "   URL: http://localhost:5601"
echo "   Usuario: elastic"
echo "   Contraseña: (sin contraseña)"
echo ""
echo "📈 Grafana (Dashboards)"
echo "   URL: http://localhost:3001"
echo "   Usuario: admin"
echo "   Contraseña: admin123"
echo ""
echo "📊 Prometheus (Métricas)"
echo "   URL: http://localhost:9090"
echo ""
echo "🚨 AlertManager (Alertas)"
echo "   URL: http://localhost:9093"
echo ""
echo "================================================"
echo ""
echo "📚 Ver documentación: cat MONITORING.md"
echo ""
echo "Útiles:"
echo "  Ver logs: docker-compose logs -f"
echo "  Parar: docker-compose down"
echo ""
