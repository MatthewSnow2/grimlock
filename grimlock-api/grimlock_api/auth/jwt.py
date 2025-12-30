"""JWT token management."""

from datetime import datetime, timedelta

from jose import JWTError, jwt

from grimlock_api.config import get_settings

settings = get_settings()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token.

    Args:
        data: Payload data to encode
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=settings.jwt_expire_hours))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        return None
