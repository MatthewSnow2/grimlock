"""Authentication API router."""

from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from grimlock_api.auth.jwt import create_access_token, verify_token
from grimlock_api.config import get_settings
from grimlock_api.schemas.auth import TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()


@router.get("/login")
async def login():
    """Initiate Google OAuth flow."""
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="OAuth not configured")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(code: str, request: Request):
    """Handle OAuth callback from Google."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=503, detail="OAuth not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.oauth_redirect_uri,
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        # Get user info
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = user_response.json()

    # Create JWT
    jwt_token = create_access_token(
        data={
            "sub": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
        }
    )

    # Redirect to dashboard with token
    dashboard_url = "https://grimlockfactory.netlify.app"
    return RedirectResponse(url=f"{dashboard_url}?token={jwt_token}")


@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """Get current authenticated user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ")[1]
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return UserResponse(
        email=payload.get("sub", ""),
        name=payload.get("name"),
        picture=payload.get("picture"),
        is_admin=False,  # Could be enhanced with role checking
    )


@router.post("/logout")
async def logout():
    """Logout endpoint (client should discard token)."""
    return {"status": "logged_out"}
