"""Authentication-related Pydantic schemas."""

from pydantic import BaseModel


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User info response."""

    email: str
    name: str | None = None
    picture: str | None = None
    is_admin: bool = False
