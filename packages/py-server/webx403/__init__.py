"""WebX403 - HTTP-native wallet authentication for Solana"""

__version__ = "1.0.0"

from .core import (
    Challenge,
    AuthorizationParams,
    VerifyResult,
    ReplayStore,
    InMemoryReplayStore,
    create_challenge,
    verify_authorization,
    base64url_encode,
    base64url_decode,
    generate_nonce,
    current_timestamp,
    parse_authorization_header,
    build_signing_string
)

from .middleware import (
    WebX403Config,
    WebX403Middleware,
    WebX403User,
    require_webx403_user
)

__all__ = [
    '__version__',
    'Challenge',
    'AuthorizationParams',
    'VerifyResult',
    'ReplayStore',
    'InMemoryReplayStore',
    'create_challenge',
    'verify_authorization',
    'base64url_encode',
    'base64url_decode',
    'generate_nonce',
    'current_timestamp',
    'parse_authorization_header',
    'build_signing_string',
    'WebX403Config',
    'WebX403Middleware',
    'WebX403User',
    'require_webx403_user'
]
