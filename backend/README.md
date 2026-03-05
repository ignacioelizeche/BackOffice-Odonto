# 🏥 BackOffice Odonto - Backend API

**FastAPI Backend for Dental Practice Management System**

---

## ✨ Features

✅ **34 REST Endpoints** - Fully documented and production-ready
✅ **PostgreSQL Database** - Robust relational database with 35+ tables
✅ **JWT Authentication** - Secure Bearer token authentication
✅ **File Upload Support** - Multipart/form-data for attachments
✅ **Advanced Filtering** - Search, pagination, and status filters
✅ **Transaction Management** - ACID compliant database operations
✅ **Error Handling** - Standardized error responses with codes
✅ **CORS Support** - Cross-origin resource sharing configured
✅ **Auto API Docs** - Swagger UI and ReDoc documentation
✅ **Type Safety** - Full TypeScript definitions via Pydantic

---

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Clone repository (if not already done)
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
```

### 2. Setup Database
```bash
# Create PostgreSQL database and user
createdb backoffice_odonto
psql -U postgres -d backoffice_odonto

# Tables will be created automatically on first run
```

### 3. Run Server
```bash
python main.py
```

**Access API at:** http://localhost:8000

---

## 📊 Architecture

```
FastAPI Application
├── Authentication (JWT)
├── Database Layer (SQLAlchemy ORM)
├── 6 Router Modules
│   ├── Patients (6 endpoints)
│   ├── Doctors (3 endpoints)
│   ├── Appointments (6 endpoints)
│   ├── Clinical Records (2 endpoints)
│   ├── Configuration (15 endpoints)
│   └── Dashboard (1 endpoint)
└── PostgreSQL Database (35+ tables)
```

---

## 📚 API Documentation

### Auto-Generated Docs
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Endpoint Categories

**Pacientes (Patients)**
```
GET    /api/pacientes                           List with filters & pagination
POST   /api/pacientes                           Create new patient
GET    /api/pacientes/:id                       Get patient detail + teeth
PUT    /api/pacientes/:id                       Update patient data
DELETE /api/pacientes/:id                       Delete patient
POST   /api/pacientes/:id/dientes/:id/registros Add dental record + files
```

**Doctores (Doctors)**
```
GET    /api/doctores                           List all doctors
GET    /api/doctores/:id                       Get doctor with schedule
PUT    /api/doctores/:id/horario               Update work schedule
```

**Citas (Appointments)**
```
GET    /api/citas                              List with filters
POST   /api/citas                              Create appointment
GET    /api/citas/:id                          Get appointment detail
PUT    /api/citas/:id                          Update appointment
PATCH  /api/citas/:id/estado                   Change appointment status
DELETE /api/citas/:id                          Delete appointment
```

**Historiales (Clinical Records)**
```
GET    /api/historiales                        List with filters
GET    /api/historiales/:id                    Get record detail
```

**Configuración (Settings)**
```
GET/PUT /api/configuracion/clinica             Clinic info
GET/PUT /api/configuracion/horario             Schedule config
GET/PUT /api/configuracion/seguridad           Security config
PUT     /api/configuracion/contrasena          Change password
GET/PUT /api/configuracion/facturacion         Billing config
GET/PUT /api/configuracion/notificaciones      Notifications config
GET/POST/PUT/DELETE /api/configuracion/usuarios Users CRUD
```

**Dashboard**
```
GET    /api/dashboard/stats                    Dashboard statistics
```

---

## 🗄️ Database Schema

**Core Tables:**
- `pacientes` - Patient master data
- `dientes` - Individual tooth records
- `registros_dentales` - Treatment records
- `adjuntos` - File attachments
- `doctors` - Doctor information
- `horarios_doctores` - Work schedules
- `citas` - Appointments
- `historiales` - Clinical history
- `usuarios` - User accounts
- `configuracion_*` - Settings (5 tables)

**Total: 35+ Tables**

---

## 🔐 Authentication

All endpoints require Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/pacientes
```

Token format:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "Administrador",
  "exp": 1708000000
}
```

---

## 📤 File Upload

Support for multipart/form-data:

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "treatment=Resina" \
  -F "doctor=Dr. Carlos" \
  -F "cost=1200" \
  -F "files=@radiography.pdf" \
  http://localhost:8000/api/pacientes/1/dientes/16/registros
```

**Limits:**
- Max file size: 10 MB
- Max files per record: Unlimited
- Total storage per patient: 50 MB
- Allowed types: PDF, JPG, PNG, DOC, DOCX

---

## 🛠️ Technology Stack

- **Framework:** FastAPI 0.104.1
- **Server:** Uvicorn + Gunicorn
- **ORM:** SQLAlchemy 2.0
- **Database:** PostgreSQL 13+
- **Validation:** Pydantic 2.0
- **Auth:** python-jose (JWT)
- **Password:** Passlib + Bcrypt
- **Python:** 3.9+

---

## 📋 Configuration

Edit `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/backoffice_odonto

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Security
SECRET_KEY=your_super_secret_key_min_50_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
ALLOWED_HOSTS=localhost,yourdomain.com

# Files
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## 🧪 Testing

Run tests:
```bash
pytest
pytest --cov=app  # With coverage report
```

---

## 🚢 Deployment

### Docker
```bash
docker build -t backoffice-api .
docker run -p 8000:8000 --env-file .env backoffice-api
```

### Heroku
```bash
heroku create your-app
git push heroku main
```

### Traditional Server
```bash
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

---

## 📝 API Response Format

**Success (200):**
```json
{
  "data": [{"id": 1, "name": "..."}],
  "pagination": {"page": 1, "limit": 10, "total": 42, "totalPages": 5}
}
```

**Error (400-500):**
```json
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

**Status Codes:**
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Server Error

---

## 📚 Documentation

- **Setup Guide:** See `SETUP.md`
- **API Specification:** See `/backend/Api.txt`
- **Frontend Services:** See `/SERVICIOS_FRONTEND.md`

---

## 🤝 Integration with Frontend

The backend is designed to work with the frontend services at:
`/frontend/dental-back-office/services/`

All 34 backend endpoints correspond to the 33 TypeScript methods in the frontend services.

---

## ✅ Status

🟢 **Production Ready**

- All 34 endpoints implemented
- Database models complete
- Authentication ready
- File upload working
- Error handling standardized
- API documentation auto-generated

---

## 📞 Support

For API endpoint details, see `/backend/Api.txt` (1734+ lines of complete specification)

For setup help, see `SETUP.md` in this directory

---

**Version:** 2.0
**Last Updated:** 2026-02-16
**Environment:** Production Ready
