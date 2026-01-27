from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import os
import logging
import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .core.config import settings
from .core.database import init_db, engine
from sqlmodel import Session as SQLModelSession
from sqlalchemy import text
# Import routers
from .auth.router import auth_router
from .routers.admin_api import admin_router
from .routers.teacher_api import teacher_router
from .routers.student_api import student_router
from .routers.files_api import files_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database
    def tables_ready() -> bool:
        try:
            with SQLModelSession(engine) as session:
                row = session.exec(text("SELECT to_regclass('public.users')")).one()
            # SQLAlchemy returns a Row object; unwrap the first column.
            value = row[0] if row is not None else None
            return value is not None
        except Exception:
            return False

    if settings.INIT_DB_ON_STARTUP:
        init_db()
        logger.info("Database initialized")
    else:
        if not tables_ready():
            logger.warning("INIT_DB_ON_STARTUP=0 but tables are missing; running init_db() once.")
            init_db()
        else:
            logger.info("INIT_DB_ON_STARTUP=0: skipping init_db()")
    
    # Create upload directories
    os.makedirs("uploads/avatars", exist_ok=True)
    os.makedirs("uploads/justifications", exist_ok=True)
    os.makedirs("uploads/bulk", exist_ok=True)
    
    yield
    
    # Shutdown: clean up resources
    logger.info("Shutting down")

app = FastAPI(
    title="Attendance Management System API",
    description="API for managing student attendance with role-based access",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred",
            "detail": str(exc)
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "detail": exc.detail
        }
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(admin_router, prefix="/api")
app.include_router(teacher_router, prefix="/api")
app.include_router(student_router, prefix="/api")
app.include_router(files_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "Attendance Management System API",
        "version": "2.0.0",
        "documentation": {
            "swagger": "/api/docs",
            "redoc": "/api/redoc"
        },
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
