"""WebX403 FastAPI Middleware"""
from typing import Optional, Callable, Dict, Any
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .core import (
    create_challenge,
    verify_authorization,
    ReplayStore,
    InMemoryReplayStore,
    VerifyResult
)


class WebX403Config:
    """Configuration for WebX403 middleware"""
    
    def __init__(
        self,
        audience: str,
        issuer: str,
        ttl_seconds: int = 60,
        clock_skew_seconds: int = 120,
        bind_method_path: bool = False,
        origin_binding: bool = False,
        ua_binding: bool = False,
        replay_store: Optional[ReplayStore] = None,
        token_gate: Optional[Callable[[str], bool]] = None,
        allowed_origins: Optional[list[str]] = None  
    ):
        self.audience = audience
        self.issuer = issuer
        self.ttl_seconds = ttl_seconds
        self.clock_skew_seconds = clock_skew_seconds
        self.bind_method_path = bind_method_path
        self.origin_binding = origin_binding
        self.ua_binding = ua_binding
        self.replay_store = replay_store or InMemoryReplayStore()
        self.token_gate = token_gate
        self.allowed_origins = allowed_origins or ["*"] 


class WebX403Middleware(BaseHTTPMiddleware):
    """FastAPI middleware for WebX403 authentication"""
    
    def __init__(
        self,
        app: ASGIApp,
        audience: str,
        issuer: str,
        ttl_seconds: int = 60,
        clock_skew_seconds: int = 120,
        bind_method_path: bool = False,
        origin_binding: bool = False,
        ua_binding: bool = False,
        replay_backend: str = "memory",
        token_gate: Optional[Callable[[str], bool]] = None,
        excluded_paths: Optional[list[str]] = None,
        allowed_origins: Optional[list[str]] = None 
    ):
        super().__init__(app)
        
        # Setup replay store
        if replay_backend == "memory":
            replay_store = InMemoryReplayStore()
        else:
            replay_store = None
        
        self.config = WebX403Config(
            audience=audience,
            issuer=issuer,
            ttl_seconds=ttl_seconds,
            clock_skew_seconds=clock_skew_seconds,
            bind_method_path=bind_method_path,
            origin_binding=origin_binding,
            ua_binding=ua_binding,
            replay_store=replay_store,
            token_gate=token_gate,
            allowed_origins=allowed_origins 
        )
        
        self.excluded_paths = excluded_paths or []
    
    def _add_cors_headers(self, response: JSONResponse, request: Request) -> JSONResponse:
        """Add CORS headers to response"""
        origin = request.headers.get('origin')
        
        # Check if origin is allowed
        if origin and (
            "*" in self.config.allowed_origins or 
            origin in self.config.allowed_origins
        ):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, User-Agent"
            response.headers["Access-Control-Expose-Headers"] = "WWW-Authenticate, Authorization"
        elif "*" in self.config.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, User-Agent"
            response.headers["Access-Control-Expose-Headers"] = "WWW-Authenticate, Authorization"
        
        return response
    
    async def dispatch(self, request: Request, call_next):
        """Process request through WebX403 authentication"""
        
        # Skip excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        auth_header = request.headers.get('authorization')
        
        if not auth_header:
            # No auth header - send challenge
            header_value, _ = create_challenge(
                method=request.method,
                path=request.url.path,
                audience=self.config.audience,
                issuer=self.config.issuer,
                ttl_seconds=self.config.ttl_seconds,
                ua_binding=self.config.ua_binding,
                origin_binding=self.config.origin_binding
            )
            
            response = JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "wallet_auth_required",
                    "detail": "Sign the challenge using your Solana wallet and resend the request."
                },
                headers={"WWW-Authenticate": header_value}
            )
            
            # ADD CORS HEADERS
            return self._add_cors_headers(response, request)
        
        # Verify authorization
        result = await verify_authorization(
            auth_header=auth_header,
            method=request.method,
            path=request.url.path,
            audience=self.config.audience,
            issuer=self.config.issuer,
            ttl_seconds=self.config.ttl_seconds,
            clock_skew_seconds=self.config.clock_skew_seconds,
            bind_method_path=self.config.bind_method_path,
            origin_binding=self.config.origin_binding,
            ua_binding=self.config.ua_binding,
            replay_store=self.config.replay_store,
            token_gate=self.config.token_gate,
            headers=dict(request.headers)
        )
        
        if not result.ok:
            # Invalid auth - send new challenge
            header_value, _ = create_challenge(
                method=request.method,
                path=request.url.path,
                audience=self.config.audience,
                issuer=self.config.issuer,
                ttl_seconds=self.config.ttl_seconds,
                ua_binding=self.config.ua_binding,
                origin_binding=self.config.origin_binding
            )
            
            response = JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": result.error,
                    "detail": "Authentication failed. Please sign the new challenge."
                },
                headers={"WWW-Authenticate": header_value}
            )
            
            # ADD CORS HEADERS
            return self._add_cors_headers(response, request)
        
        # Success - attach user to request state
        request.state.webx403_user = {
            "address": result.address,
            "challenge": result.challenge
        }
        
        response = await call_next(request)
        return response


class WebX403User:
    """User information from WebX403 authentication"""
    
    def __init__(self, address: str, challenge: Optional[Dict[str, Any]] = None):
        self.address = address
        self.challenge = challenge


def require_webx403_user(request: Request) -> WebX403User:
    """
    Dependency to extract WebX403 user from request
    
    Usage:
        @app.get("/protected")
        async def protected(user: WebX403User = Depends(require_webx403_user)):
            return {"address": user.address}
    """
    user_data = getattr(request.state, "webx403_user", None)
    
    if not user_data:
        raise RuntimeError("WebX403 user not found in request state")
    
    return WebX403User(
        address=user_data["address"],
        challenge=user_data.get("challenge")
    )


__all__ = [
    'WebX403Config',
    'WebX403Middleware',
    'WebX403User',
    'require_webx403_user'
]
