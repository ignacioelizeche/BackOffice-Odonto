# 🚀 Backend Setup Guide - BackOffice Odonto

## Prerequisites

- Python 3.9+
- PostgreSQL 13+
- pip (Python package manager)

---

## Installation Steps

### 1. Create Virtual Environment

```bash
python -m venv venv
```

**Activate virtual environment:**

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

---

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 3. Setup Environment Variables

**Copy the example file:**
```bash
cp .env.example .env
```

**Edit `.env` with your configuration:**
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/backoffice_odonto

# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Security
SECRET_KEY=your_super_secret_key_change_in_production_12345678901234567890
ALGORITHM=HS256

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

---

### 4. Setup Database

**Create PostgreSQL database:**

```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create database
CREATE DATABASE backoffice_odonto;

-- Create user
CREATE USER odonto_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE backoffice_odonto TO odonto_user;

-- Exit psql
\q
```

**Alternative: Using pgAdmin**
1. Open pgAdmin
2. Create new database: `backoffice_odonto`
3. Create new user: `odonto_user`

---

### 5. Initialize Database Tables

The tables will be created automatically when you run the backend for the first time (SQLAlchemy creates them from models).

To manually create using Alembic (optional):

```bash
alembic upgrade head
```

---

### 6. Run Backend Server

**Development mode (with auto-reload):**
```bash
python main.py
```

Or:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode (with Gunicorn):**
```bash
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

---

### 7. Access API Documentation

Once the server is running:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **API Health:** http://localhost:8000/health
- **API Info:** http://localhost:8000/

---

## Project Structure

```
backend/
├── main.py ........................... Main application entry point
├── requirements.txt .................. Python dependencies
├── .env.example ...................... Environment variables template
├── .env ............................. (Create this, don't commit)
│
├── app/
│   ├── __init__.py
│   ├── config.py ..................... Configuration settings
│   ├── database.py ................... Database setup
│   ├── auth.py ....................... JWT authentication
│   ├── models.py ..................... SQLAlchemy models (35+ tables)
│   ├── schemas.py .................... Pydantic schemas (50+ types)
│   │
│   └── routers/
│       ├── __init__.py
│       ├── patients.py ............... 6 endpoints
│       ├── doctors.py ................ 3 endpoints
│       ├── appointments.py ........... 6 endpoints
│       ├── clinical_records.py ....... 2 endpoints
│       ├── configuration.py .......... 15 endpoints
│       └── dashboard.py .............. 1 endpoint
│
└── uploads/ ........................... File storage (created on first use)
```

---

## Database Schema Overview

### Main Tables:
- `pacientes` - Patient information
- `dientes` - Individual teeth records
- `registros_dentales` - Dental treatment records
- `adjuntos` - File attachments
- `doctores` - Doctor information
- `horarios_doctores` - Doctor work schedules
- `estadisticas_doctores` - Doctor monthly statistics
- `citas` - Appointments
- `historiales` - Clinical history records
- `configuracion_*` - Configuration tables (5 tables)
- `usuarios` - User management
- `dashboard_stats` - Dashboard statistics cache

---

## API Endpoints Summary

### Patients (6 endpoints)
- `GET /api/pacientes` - List patients
- `POST /api/pacientes` - Create patient
- `GET /api/pacientes/:id` - Patient detail
- `PUT /api/pacientes/:id` - Update patient
- `DELETE /api/pacientes/:id` - Delete patient
- `POST /api/pacientes/:id/dientes/:toothNumber/registros` - Add dental record

### Doctors (3 endpoints)
- `GET /api/doctores` - List doctors
- `GET /api/doctores/:id` - Doctor detail
- `PUT /api/doctores/:id/horario` - Update schedule

### Appointments (6 endpoints)
- `GET /api/citas` - List appointments
- `POST /api/citas` - Create appointment
- `GET /api/citas/:id` - Appointment detail
- `PUT /api/citas/:id` - Update appointment
- `PATCH /api/citas/:id/estado` - Change status
- `DELETE /api/citas/:id` - Delete appointment

### Clinical Records (2 endpoints)
- `GET /api/historiales` - List records
- `GET /api/historiales/:id` - Record detail

### Configuration (15 endpoints)
- **Clinic**: GET/PUT `/api/configuracion/clinica`
- **Schedule**: GET/PUT `/api/configuracion/horario`
- **Security**: GET/PUT `/api/configuracion/seguridad`, PUT `/api/configuracion/contrasena`
- **Billing**: GET/PUT `/api/configuracion/facturacion`
- **Notifications**: GET/PUT `/api/configuracion/notificaciones`
- **Users**: GET/POST/PUT/DELETE `/api/configuracion/usuarios`

### Dashboard (1 endpoint)
- `GET /api/dashboard/stats` - Dashboard statistics

---

## Authentication

All endpoints (except `/health` and `/`) require Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

The token should be obtained from a login endpoint (not yet implemented in this skeleton).

---

## File Upload

Support for multipart/form-data uploads:

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "treatment=Limpieza" \
  -F "doctor=Dr. Carlos" \
  -F "cost=1200" \
  -F "files=@radiography.pdf" \
  "http://localhost:8000/api/pacientes/1/dientes/16/registros"
```

---

## Common Issues & Solutions

### Issue: "psycopg2 failed to initialize the libpq library"
**Solution:** Install libpq-dev (Linux) or use psycopg2-binary

### Issue: "Database connection refused"
**Solution:** Check PostgreSQL is running and credentials are correct in .env

### Issue: "ModuleNotFoundError: app"
**Solution:** Make sure you're running from the backend directory

### Issue: "CORS error from frontend"
**Solution:** Update `ALLOWED_ORIGINS` in .env with frontend URL

---

## Testing

Run unit tests:
```bash
pytest
```

With coverage:
```bash
pytest --cov=app tests/
```

---

## Deployment

### Using Docker (recommended)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "main:app"]
```

Build and run:
```bash
docker build -t backoffice-odonto-api .
docker run -p 8000:8000 --env-file .env backoffice-odonto-api
```

### Using Heroku

1. Create `Procfile`:
```
web: gunicorn main:app
```

2. Deploy:
```bash
heroku create your-app-name
git push heroku main
```

---

## Production Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `ENVIRONMENT=production`
- [ ] Use environment-specific database credentials
- [ ] Enable HTTPS/SSL
- [ ] Setup proper logging
- [ ] Configure backups for database
- [ ] Setup monitoring and alerting
- [ ] Run security audit (e.g., `safety check`)
- [ ] Test all endpoints with frontend
- [ ] Setup CI/CD pipeline

---

## Support & Documentation

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **SQLAlchemy Docs:** https://docs.sqlalchemy.org/
- **Pydantic Docs:** https://docs.pydantic.dev/
- **API Specification:** See `/backend/Api.txt`

---

**Version:** 2.0
**Last Updated:** 2026-02-16
