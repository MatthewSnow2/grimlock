"""API routers for GRIMLOCK API."""

from grimlock_api.routers.builds import router as builds_router
from grimlock_api.routers.analytics import router as analytics_router
from grimlock_api.routers.projects import router as projects_router
from grimlock_api.routers.prd import router as prd_router
from grimlock_api.routers.health import router as health_router
from grimlock_api.routers.auth import router as auth_router

__all__ = [
    "builds_router",
    "analytics_router",
    "projects_router",
    "prd_router",
    "health_router",
    "auth_router",
]
