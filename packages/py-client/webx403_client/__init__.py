"""WebX403 Python Client - Manual wallet authentication for scripts and agents"""
import json
import base64
import secrets
import re
from datetime import datetime
from typing import Dict, Optional, Any
from urllib.parse import urlparse


import requests
import base58
from solders.keypair import Keypair
from nacl.signing import SigningKey



class WebX403ClientError(Exception):
    """Base exception for WebX403 client errors"""
    pass



class WebX403Client:
    """
    Python client for WebX403 wallet authentication.
    
    This client is designed for server-side Python applications and scripts
    that need to authenticate with WebX403-protected APIs using a Solana keypair.
    
    Example:
        from solders.keypair import Keypair
        from webx403_client import WebX403Client
        
        keypair = Keypair.generate()
        client = WebX403Client(keypair)
        
        response = client.authenticate('https://api.example.com/protected')
        print(response.json())
    """
    
    def __init__(self, keypair: Keypair):
        """
        Initialize client with a Solana keypair.
        
        Args:
            keypair: Solana keypair for signing challenges
        """
        self.keypair = keypair
        self.address = str(keypair.pubkey())
    
    def authenticate(
        self,
        url: str,
        method: str = 'GET',
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None
    ) -> requests.Response:
        """
        Authenticate with a WebX403-protected endpoint.
        
        This method handles the complete authentication flow:
        1. Makes initial request
        2. If 403, extracts challenge
        3. Signs challenge with keypair
        4. Retries request with Authorization header
        
        Args:
            url: API endpoint URL
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            headers: Additional headers to send
            data: Form data to send (for POST/PUT)
            json_data: JSON data to send (for POST/PUT)
        
        Returns:
            requests.Response object from the authenticated request
        
        Raises:
            WebX403ClientError: If authentication fails
        """
        headers = headers or {}
        
        # Step 1: Initial request
        response = self._make_request(url, method, headers, data, json_data)
        
        # Step 2: Check if we got a 403 challenge
        if response.status_code == 403:
            www_auth = response.headers.get('WWW-Authenticate', '')
            
            if not www_auth.startswith('WebX403'):
                raise WebX403ClientError(
                    f"Expected WebX403 challenge, got: {www_auth[:50]}"
                )
            
            # Extract challenge
            challenge_b64 = self._extract_challenge(www_auth)
            if not challenge_b64:
                raise WebX403ClientError("No challenge found in WWW-Authenticate header")
            
            # Step 3: Sign challenge
            signature_b58 = self._sign_challenge(challenge_b64)
            
            # Step 4: Build Authorization header
            auth_header = self._build_authorization(
                challenge_b64,
                signature_b58,
                method,
                urlparse(url).path
            )
            
            # Step 5: Retry with Authorization
            headers['Authorization'] = auth_header
            response = self._make_request(url, method, headers, data, json_data)
        
        return response
    
    def _make_request(
        self,
        url: str,
        method: str,
        headers: Dict[str, str],
        data: Optional[Dict[str, Any]],
        json_data: Optional[Dict[str, Any]]
    ) -> requests.Response:
        """Make HTTP request"""
        return requests.request(
            method=method,
            url=url,
            headers=headers,
            data=data,
            json=json_data
        )
    
    def _extract_challenge(self, www_authenticate: str) -> Optional[str]:
        """Extract base64url-encoded challenge from WWW-Authenticate header"""
        match = re.search(r'challenge="([^"]+)"', www_authenticate)
        return match.group(1) if match else None
    
    def _sign_challenge(self, challenge_b64: str) -> str:
        """
        Sign a challenge and return base58-encoded signature.
        
        Args:
            challenge_b64: Base64url-encoded challenge from server
        
        Returns:
            Base58-encoded signature
        """
        # Decode challenge
        challenge_json = self._base64url_decode(challenge_b64)
        challenge = json.loads(challenge_json)
        
        # Build signing string
        signing_string = self._build_signing_string(challenge)
        
        # Sign with keypair
        message = signing_string.encode('utf-8')
        signing_key = SigningKey(bytes(self.keypair.secret()))
        signed = signing_key.sign(message)
        
        # Return base58-encoded signature
        return base58.b58encode(signed.signature).decode('ascii')
    
    def _build_signing_string(self, challenge: Dict[str, Any]) -> str:
        """Build canonical signing string from challenge"""
        # Sort challenge keys for deterministic JSON
        payload = json.dumps(challenge, sort_keys=True)
        
        lines = [
            'WebX403 Challenge',
            '',
            f'domain: {challenge["aud"]}',
            f'server: {challenge["serverId"]}',
            f'nonce: {challenge["nonce"]}',
            f'ts: {challenge["ts"]}',
            f'method: {challenge["method"]}',
            f'path: {challenge["path"]}',
            '',
            f'payload: {payload}'
        ]
        
        return '\n'.join(lines)
    
    def _build_authorization(
        self,
        challenge_b64: str,
        signature_b58: str,
        method: str,
        path: str
    ) -> str:
        """Build Authorization header value"""
        nonce = self._generate_nonce()
        ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        bind = f'{method}:{path}'
        
        return (
            f'WebX403 '
            f'addr="{self.address}", '
            f'sig="{signature_b58}", '
            f'challenge="{challenge_b64}", '
            f'ts="{ts}", '
            f'nonce="{nonce}", '
            f'bind="{bind}"'
        )
    
    @staticmethod
    def _generate_nonce() -> str:
        """Generate cryptographically random nonce"""
        return base58.b58encode(secrets.token_bytes(16)).decode('ascii')
    
    @staticmethod
    def _base64url_decode(s: str) -> str:
        """Decode base64url string"""
        # Add padding
        padding = (4 - len(s) % 4) % 4
        s_padded = s + '=' * padding
        
        decoded = base64.urlsafe_b64decode(s_padded)
        return decoded.decode('utf-8')



def create_client(keypair: Keypair) -> WebX403Client:
    """
    Factory function to create a WebX403Client.
    
    Args:
        keypair: Solana keypair for authentication
    
    Returns:
        Configured WebX403Client instance
    """
    return WebX403Client(keypair)



__all__ = [
    'WebX403Client',
    'WebX403ClientError',
    'create_client'
]
