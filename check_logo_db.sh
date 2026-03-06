#!/bin/bash

# Script para ver la tabla configuracion_clinica y los logos guardados

echo "================================"
echo "Ver tabla configuracion_clinica"
echo "================================"
echo ""

# Conectarse al postgres del docker y ejecutar query
docker exec -it postgresql psql -U postgres -d backoffice_odonto -c "SELECT id, empresa_id, name, logo_url, updated_at FROM configuracion_clinica;"

echo ""
echo "================================"
echo "Arquivos de logo en uploads"
echo "================================"
echo ""

# Ver archivos de logo
docker exec -it postgresql ls -lah /opt/BackOffice-Odonto/uploads/logo_clinica_* 2>/dev/null || echo "No hay archivos de logo encontrados"

echo ""
echo "================================"
echo "Contar logos por empresa"
echo "================================"
echo ""

docker exec -it postgresql psql -U postgres -d backoffice_odonto -c "SELECT empresa_id, COUNT(*) FROM configuracion_clinica WHERE logo_url IS NOT NULL GROUP BY empresa_id;"
