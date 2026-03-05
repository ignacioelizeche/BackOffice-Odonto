# BackOffice Odonto 🦷

Sistema de gestión de clínica dental con roles basados en doctores y administradores. Built with **FastAPI**, **Next.js**, y **PostgreSQL**.

## 🎯 Features

### 📋 Gestión de Citas
- Calendario interactivo de citas
- Estados de cita (confirmada, iniciada, completada, cancelada)
- Recordatorios automáticos 30 minutos antes
- Asignación a doctores

### 👥 Gestión de Pacientes
- Registro de pacientes con datos médicos
- Historial de citas
- Asignación a doctores especialistas

### 👨‍⚕️ Gestión de Doctores
- Perfiles de doctores con especialidad
- Estados en tiempo real (disponible, en consulta, no disponible)
- Horarios de disponibilidad
- Dashboard personalizado

### 📊 Dashboard
- Estadísticas del doctor/clínica
- Actividad reciente
- Métricas de citas

### 🔔 Sistema de Notificaciones
- Notificaciones en tiempo real
- Tipos: cita agendada, paciente nuevo, recordatorios, estado de cita
- Marca como leído/no leído
- Historial persistente

### 🔐 Seguridad
- Autenticación JWT
- Control de acceso basado en roles (RBAC)
- Validación de datos
- CORS configurado

## 🛠 Stack Tecnológico

### Backend
- **FastAPI 0.104+** - Framework web moderno
- **PostgreSQL 16** - Base de datos
- **SQLAlchemy** - ORM
- **Alembic** - Migraciones de BD

### Frontend
- **Next.js 14** - React framework
- **TailwindCSS** - Estilos
- **Shadcn/ui** - Componentes UI
- **TypeScript** - Type safety

### DevOps
- **Docker & Docker Compose** - Containerización
- **Uvicorn** - ASGI server

## 🚀 Quick Start

### Con Docker (Recomendado)

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd BackOffice_Odonto

# 2. Iniciar con script automatizado
./scripts/docker-start.sh

# O manualmente:
cp .env.example .env.local
docker-compose up -d
```

Accede a:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (Swagger: /docs)
- **Database**: localhost:5432

### Sin Docker (Desarrollo local)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend/dental-back-office
npm install
npm run dev
```

## 📖 Documentación

- [**Docker Setup Guide**](./DOCKER.md) - Guía completa para Docker
- [**Backend SETUP**](./backend/SETUP.md) - Instalación y configuración
- API Docs: http://localhost:8000/docs (Swagger UI)
- [**Deployment Plan**](./DEPLOYMENT.md) - Guía de deployment a producción

## 📁 Estructura del Proyecto

```
BackOffice_Odonto/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── models/           # Database models (SQLAlchemy)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── main.py           # FastAPI app
│   ├── migrations/           # Alembic migrations
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile           # Production image
│
├── frontend/dental-back-office/
│   ├── app/                  # Next.js routes
│   ├── components/           # React components
│   ├── services/            # API clients
│   ├── contexts/            # Context API
│   ├── styles/              # TailwindCSS
│   ├── package.json         # Node dependencies
│   └── Dockerfile           # Production image
│
├── docker-compose.yml        # Development stack
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
└── DOCKER.md                # Docker documentation
```

## 🔑 Roles y Permisos

### Administrador
- Gestión completa de clínica
- Crear/editar doctores, pacientes, citas
- Configuración de sistema
- Ver todas las notificaciones
- Horarios y calendario global

### Doctor
- Ver solo sus pacientes asignados
- Ver solo sus citas
- Actualizar estado de citas
- Ver sus notificaciones personales
- Cambiar estado manual (disponible/en consulta/no disponible)

## 🔌 API Endpoints

### Autenticación
```
POST /api/login          # Login
POST /api/register       # Registro (solo admin)
GET  /api/profile        # Perfil del usuario actual
```

### Notificaciones
```
GET  /api/notificaciones              # Listar
PUT  /api/notificaciones/{id}/read    # Marcar como leído
DELETE /api/notificaciones/{id}       # Eliminar
```

### Doctores
```
GET  /api/doctores              # Listar
POST /api/doctores              # Crear (admin)
GET  /api/doctores/{id}         # Detalle
PUT  /api/doctores/{id}/status  # Cambiar estado
```

### Pacientes
```
GET  /api/pacientes         # Listar
POST /api/pacientes         # Crear
GET  /api/pacientes/{id}    # Detalle
```

### Citas
```
GET  /api/citas              # Listar
POST /api/citas              # Crear
PUT  /api/citas/{id}/estado  # Cambiar estado
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend/dental-back-office
npm run test
```

## 📌 Requisitos

- **Docker & Docker Compose** OR
- **Python 3.11+** + **Node.js 20+**
- **PostgreSQL 16** (si no usas Docker)

## 🔐 Variables de Entorno

Ver `.env.example` para todas las opciones. Las principales:

```env
# Base de datos
DB_USER=postgres
DB_PASSWORD=postgres
POSTGRES_DB=backoffice_odonto

# FastAPI
ENVIRONMENT=development
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚨 Troubleshooting

### Puerto en uso
```bash
# Linux/Mac: Matar proceso en puerto
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### BD no inicia
```bash
docker-compose restart db
# O limpiar todo
docker-compose down -v
docker-compose up -d
```

### Build fallando
```bash
# Reconstruir sin caché
docker-compose build --no-cache
```

Ver más en [DOCKER.md](./DOCKER.md)

## 📝 Changelog

### v2.0 (Actual)
- ✨ Sistema de notificaciones completo
- ✨ Roles basados en doctores
- ✅ Docker containerización
- 🔒 JWT authentication mejorado
- 📱 Responsive design

### v1.0
- Gestión básica de citas y pacientes
- Dashboard

## 📄 Licencia

Proprietary - BackOffice Odonto

## 👨‍💻 Contribuciones

Para contribuir:
1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para issues o preguntas, abre un [GitHub Issue](https://github.com/tu-repo/issues)

---

**Made with ❤️ for dental clinics**
