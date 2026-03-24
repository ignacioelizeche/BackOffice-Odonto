"""
FastAPI Backend para AgilDent
- Uvicorn server
- PostgreSQL database
- JWT authentication
- Multipart file upload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.routers import patients, doctors, appointments, configuration, dashboard, auth, notifications, calendar
from app.routers import whatsapp_flow_api
from app.database import engine, Base
from app.limiter import limiter
from app.tasks.scheduled_tasks import init_scheduler
import logging

# Create database tables
# NOTE: Tablas gestionadas por Alembic. Usar 'alembic upgrade head' en lugar de create_all.
Base.metadata.create_all(bind=engine)

# Determine environment
_environment = os.getenv("ENVIRONMENT", "development")
_is_production = _environment == "production"

# Create FastAPI app
app = FastAPI(
    title="AgilDent API",
    description="API para gestión de clínica dental",
    version="2.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json"
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS with proper settings
_origins_env = os.getenv("CORS_ORIGINS", os.getenv("ALLOWED_ORIGINS", ""))
if _origins_env and _origins_env.strip() != "*":
    # Specific origins provided
    cors_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
elif _origins_env and _origins_env.strip() == "*":
    # Allow all origins
    cors_origins = ["*"]
else:
    # Default to localhost:3000
    cors_origins = ["http://localhost:3000", "http://localhost:8443", "http://localhost:8080"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Autenticación"])
app.include_router(patients.router, prefix="/api", tags=["Pacientes"])
app.include_router(doctors.router, prefix="/api", tags=["Doctores"])
app.include_router(appointments.router, prefix="/api", tags=["Citas"])
app.include_router(configuration.router, prefix="/api", tags=["Configuración"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(notifications.router, prefix="/api", tags=["Notificaciones"])
app.include_router(calendar.router, tags=["Calendar"])
app.include_router(whatsapp_flow_api.router, tags=["WhatsApp Flow"])

# Setup logging
logger = logging.getLogger(__name__)

# Initialize scheduler on startup
@app.on_event("startup")
async def startup_event():
    """Initialize background scheduler on application startup"""
    try:
        init_scheduler(app)
        logger.info("[App Startup] Scheduler initialized successfully")
    except Exception as e:
        logger.error(f"[App Startup] Error initializing scheduler: {e}")
        # App will continue but reminders won't work

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on application shutdown"""
    logger.info("[App Shutdown] Application shutting down")
    # APScheduler will shut down automatically

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0"}

@app.get("/", tags=["Root"])
def root():
    """Root endpoint"""
    return {
        "message": "AgilDent API v2.0",
        "docs": "/docs",
        "endpoints": 32,
        "services": ["Pacientes", "Doctores", "Citas", "Configuración", "Dashboard"]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT", "development") == "development",
        log_level=os.getenv("LOG_LEVEL", "info")
    )
