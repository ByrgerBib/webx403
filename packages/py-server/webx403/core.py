"""WebX403 Python Server SDK - Core Functions"""
import json
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Any, Protocol
from dataclasses import dataclass
import base58
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError


@dataclass
class Challenge:
    """WebX403 challenge structure"""
    v: int
    alg: str
    nonce: str
    ts: str
    aud: str
    method: str
    path: str
    uaBind: bool
    originBind: bool
    serverId: str
    exp: str
    ext: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "v": self.v,
            "alg": self.alg,
            "nonce": self.nonce,
            "ts": self.ts,
            "aud": self.aud,
            "method": self.method,
            "path": self.path,
            "uaBind": self.uaBind,
            "originBind": self.originBind,
            "serverId": self.serverId,
            "exp": self.exp,
            "ext": self.ext
        }


@dataclass
class AuthorizationParams:
    """Parsed authorization header parameters"""
    addr: str
    sig: str
    challenge: str
    ts: str
    nonce: str
    bind: Optional[str] = None


@dataclass
class VerifyResult:
    """Verification result"""
    ok: bool
    address: Optional[str] = None
    challenge: Optional[Challenge] = None
    error: Optional[str] = None


class ReplayStore(Protocol):
    """Protocol for replay protection stores"""
    async def check(self, key: str, ttl_seconds: int) -> bool:
        """Check if nonce was already used"""
        ...
    
    async def store(self, key: str, ttl_seconds: int) -> None:
        """Store nonce to prevent replay"""
        ...


class InMemoryReplayStore:
    """Simple in-memory replay store with LRU-like behavior"""
    
    def __init__(self, max_size: int = 10000):
        self._cache: Dict[str, float] = {}
        self._max_size = max_size
    
    async def check(self, key: str, ttl_seconds: int) -> bool:
        """Check if key exists and not expired"""
        expiry = self._cache.get(key)
        if not expiry:
            return False
        
        if datetime.now(timezone.utc).timestamp() > expiry:
            del self._cache[key]
            return False
        
        return True
    
    async def store(self, key: str, ttl_seconds: int) -> None:
        """Store key with expiry"""
        # Simple LRU: remove oldest if at capacity
        if len(self._cache) >= self._max_size:
            oldest = next(iter(self._cache))
            del self._cache[oldest]
        
        expiry = datetime.now(timezone.utc).timestamp() + ttl_seconds
        self._cache[key] = expiry
        
        # Periodic cleanup
        if secrets.randbelow(100) < 1:  # 1% chance
            self._cleanup()
    
    def _cleanup(self) -> None:
        """Remove expired entries"""
        now = datetime.now(timezone.utc).timestamp()
        expired = [k for k, v in self._cache.items() if now > v]
        for k in expired:
            del self._cache[k]


def base64url_encode(data: bytes | str) -> str:
    """Encode to base64url (no padding)"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    b64 = base64.urlsafe_b64encode(data).decode('ascii')
    return b64.rstrip('=')


def base64url_decode(s: str) -> str:
    """Decode from base64url"""
    # Add padding
    padding = (4 - len(s) % 4) % 4
    s_padded = s + '=' * padding
    
    decoded = base64.urlsafe_b64decode(s_padded)
    return decoded.decode('utf-8')


def generate_nonce() -> str:
    """Generate cryptographically random nonce"""
    return base64url_encode(secrets.token_bytes(16))


def current_timestamp() -> str:
    """Get current UTC timestamp in ISO format"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_authorization_header(header: str) -> Optional[AuthorizationParams]:
    """Parse WebX403 authorization header"""
    if not header.startswith('WebX403 '):
        return None
    
    params: Dict[str, str] = {}
    import re
    
    for match in re.finditer(r'(\w+)="([^"]*)"', header):
        params[match.group(1)] = match.group(2)
    
    required = ['addr', 'sig', 'challenge', 'ts', 'nonce']
    if not all(k in params for k in required):
        return None
    
    return AuthorizationParams(
        addr=params['addr'],
        sig=params['sig'],
        challenge=params['challenge'],
        ts=params['ts'],
        nonce=params['nonce'],
        bind=params.get('bind')
    )


def build_signing_string(challenge: Challenge) -> str:
    """Build canonical signing string"""
    # Sort keys for deterministic JSON
    payload = json.dumps(challenge.to_dict(), sort_keys=True)
    
    lines = [
        'WebX403 Challenge',
        '',
        f'domain: {challenge.aud}',
        f'server: {challenge.serverId}',
        f'nonce: {challenge.nonce}',
        f'ts: {challenge.ts}',
        f'method: {challenge.method}',
        f'path: {challenge.path}',
        '',
        f'payload: {payload}'
    ]
    
    return '\n'.join(lines)


def create_challenge(
    method: str,
    path: str,
    audience: str,
    issuer: str,
    ttl_seconds: int = 60,
    ua_binding: bool = False,
    origin_binding: bool = False,
    ext: Optional[Dict[str, Any]] = None
) -> tuple[str, Challenge]:
    """
    Create a WebX403 challenge
    
    Returns:
        (header_value, challenge_object)
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=ttl_seconds)
    
    challenge = Challenge(
        v=1,
        alg='ed25519-solana',
        nonce=generate_nonce(),
        ts=now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        aud=audience,
        method=method,
        path=path,
        uaBind=ua_binding,
        originBind=origin_binding,
        serverId=issuer,
        exp=exp.strftime('%Y-%m-%dT%H:%M:%SZ'),
        ext=ext or {}
    )
    
    challenge_json = json.dumps(challenge.to_dict(), sort_keys=True)
    challenge_encoded = base64url_encode(challenge_json)
    
    header_value = f'WebX403 realm="{issuer}", version="1", challenge="{challenge_encoded}"'
    
    return header_value, challenge


async def verify_authorization(
    auth_header: str,
    method: str,
    path: str,
    audience: str,
    issuer: str,
    ttl_seconds: int = 60,
    clock_skew_seconds: int = 120,
    bind_method_path: bool = False,
    origin_binding: bool = False,
    ua_binding: bool = False,
    replay_store: Optional[ReplayStore] = None,
    token_gate: Optional[callable] = None,
    headers: Optional[Dict[str, str]] = None
) -> VerifyResult:
    """
    Verify WebX403 authorization header
    
    Returns:
        VerifyResult with ok=True and address on success
    """
    # Parse header
    params = parse_authorization_header(auth_header)
    if not params:
        return VerifyResult(ok=False, error="Invalid authorization header")
    
    # Decode challenge
    try:
        challenge_json = base64url_decode(params.challenge)
        challenge_dict = json.loads(challenge_json)
        challenge = Challenge(**challenge_dict)
    except Exception as e:
        return VerifyResult(ok=False, error=f"Invalid challenge format: {e}")
    
    # Check protocol version
    if challenge.v != 1:
        return VerifyResult(ok=False, error="Unsupported protocol version")
    
    # Check algorithm
    if challenge.alg != 'ed25519-solana':
        return VerifyResult(ok=False, error="Unsupported algorithm")
    
    # Check expiration
    try:
        exp_time = datetime.fromisoformat(challenge.exp.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > exp_time:
            return VerifyResult(ok=False, error="Challenge expired")
    except Exception:
        return VerifyResult(ok=False, error="Invalid expiration format")
    
    # Check audience
    if challenge.aud != audience:
        return VerifyResult(ok=False, error="Invalid audience")
    
    # Check server ID
    if challenge.serverId != issuer:
        return VerifyResult(ok=False, error="Invalid server ID")
    
    # Check timestamp skew
    try:
        client_ts = datetime.fromisoformat(params.ts.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = abs((now - client_ts).total_seconds())
        
        if diff > clock_skew_seconds:
            return VerifyResult(ok=False, error="Timestamp outside allowed skew")
    except Exception:
        return VerifyResult(ok=False, error="Invalid timestamp format")
    
    # Check method/path binding
    if bind_method_path or params.bind:
        if challenge.method != method or challenge.path != path:
            return VerifyResult(ok=False, error="Method/path mismatch")
        
        if params.bind:
            expected_bind = f"{method}:{path}"
            if params.bind != expected_bind:
                return VerifyResult(ok=False, error="Bind parameter mismatch")
    
    # Check origin binding
    if challenge.originBind and headers:
        origin = headers.get('origin') or headers.get('referer')
        if not origin:
            return VerifyResult(ok=False, error="Origin binding required but not provided")
        
        try:
            from urllib.parse import urlparse
            origin_parsed = urlparse(origin)
            aud_parsed = urlparse(challenge.aud)
            
            if f"{origin_parsed.scheme}://{origin_parsed.netloc}" != f"{aud_parsed.scheme}://{aud_parsed.netloc}":
                return VerifyResult(ok=False, error="Origin binding mismatch")
        except Exception:
            return VerifyResult(ok=False, error="Invalid origin format")
    
    # Check UA binding
    if challenge.uaBind and headers:
        if not headers.get('user-agent'):
            return VerifyResult(ok=False, error="User-Agent binding required but not provided")
    
    # Check replay
    if replay_store:
        replay_key = f"{params.addr}:{params.nonce}"
        is_replay = await replay_store.check(replay_key, ttl_seconds)
        
        if is_replay:
            return VerifyResult(ok=False, error="Nonce already used (replay detected)")
        
        await replay_store.store(replay_key, ttl_seconds)
    
    # Verify signature
    try:
        public_key_bytes = base58.b58decode(params.addr)
        signature_bytes = base58.b58decode(params.sig)
        
        signing_string = build_signing_string(challenge)
        message = signing_string.encode('utf-8')
        
        verify_key = VerifyKey(public_key_bytes)
        verify_key.verify(message, signature_bytes)
        
    except BadSignatureError:
        return VerifyResult(ok=False, error="Invalid signature")
    except Exception as e:
        return VerifyResult(ok=False, error=f"Signature verification failed: {e}")
    
    # Check token gate
    if token_gate:
        try:
            allowed = await token_gate(params.addr)
            if not allowed:
                return VerifyResult(ok=False, error="Token gate check failed")
        except Exception as e:
            return VerifyResult(ok=False, error=f"Token gate error: {e}")
    
    return VerifyResult(ok=True, address=params.addr, challenge=challenge)


__all__ = [
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
    'build_signing_string'
]
