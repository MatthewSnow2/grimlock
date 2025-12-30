"""FastAPI application entry point for GRIMLOCK API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from grimlock_api import __version__
from grimlock_api.config import get_settings
from grimlock_api.database import close_db, init_db
from grimlock_api.routers import (
    analytics_router,
    auth_router,
    builds_router,
    health_router,
    prd_router,
    projects_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="GRIMLOCK API",
    description="FastAPI backend for GRIMLOCK autonomous MCP server factory",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(builds_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(prd_router, prefix="/api")
app.include_router(auth_router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "GRIMLOCK API",
        "version": __version__,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api")
async def api_info():
    """API information endpoint."""
    return {
        "version": __version__,
        "endpoints": {
            "builds": "/api/builds",
            "analytics": "/api/analytics",
            "projects": "/api/projects",
            "prd": "/api/prd",
            "health": "/api/health",
            "auth": "/auth",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "grimlock_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
