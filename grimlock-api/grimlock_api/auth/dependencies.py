"""Authentication dependencies for FastAPI."""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from grimlock_api.auth.jwt import verify_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Get current user from JWT token (optional).

    Returns:
        User payload if authenticated, None otherwise
    """
    if not credentials:
        return None

    payload = verify_token(credentials.credentials)
    return payload


async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Require authentication (mandatory).

    Raises:
        HTTPException: If not authenticated

    Returns:
        User payload
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
