# WebX403 Protocol Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2025-11-05

## Abstract

WebX403 defines an HTTP-native authentication protocol using HTTP 403 challenges for Solana wallet-based authentication. This specification describes the message formats, verification procedures, and security considerations for implementing compliant clients and servers.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Protocol Overview](#2-protocol-overview)
3. [HTTP Headers](#3-http-headers)
4. [Challenge Format](#4-challenge-format)
5. [Authorization Format](#5-authorization-format)
6. [Verification Algorithm](#6-verification-algorithm)
7. [Security Considerations](#7-security-considerations)
8. [Extension Mechanisms](#8-extension-mechanisms)
9. [Error Handling](#9-error-handling)
10. [Examples](#10-examples)

---

## 1. Introduction

### 1.1 Motivation

Traditional web authentication relies on centralized identity providers or long-lived sessions. WebX403 enables **stateless, cryptographic wallet-based authentication** using standard HTTP semantics.

### 1.2 Design Goals

- **HTTP-native**: Use existing HTTP status codes and headers
- **Stateless**: No server-side session storage required
- **Secure**: Cryptographic signatures with replay protection
- **Simple**: Easy to implement and deploy
- **Extensible**: Support for token-gating and custom policies


### 1.3 Terminology

- **Wallet**: Solana Ed25519 keypair with address (public key)
- **Challenge**: Server-generated authentication task
- **Signature**: Ed25519 signature over challenge
- **Nonce**: Single-use random value for replay protection
- **TTL**: Time-To-Live for challenge validity

---

## 2. Protocol Overview

### 2.1 Authentication Flow

```
┌──────┐                     ┌──────┐
│Client│                     │Server│
└──┬───┘                     └──┬───┘
   │                            │
   │  1. GET /protected        │
   ├──────────────────────────>│
   │                            │
   │  2. 403 Forbidden          │
   │     WWW-Authenticate: ...  │
   │<───────────────────────────┤
   │                            │
   │  [User signs challenge]    │
   │                            │
   │  3. GET /protected         │
   │     Authorization: ...     │
   ├──────────────────────────>│
   │                            │
   │  4. 200 OK                 │
   │<───────────────────────────┤
   │                            │
```


### 2.2 Protocol Name and Version

- **Scheme**: `WebX403`
- **Current Version**: `1`
- **Algorithm**: `ed25519-solana`

All implementations MUST include `version="1"` in headers.

---

## 3. HTTP Headers

### 3.1 WWW-Authenticate Header (Server → Client)

**Format**:

```
WWW-Authenticate: WebX403 realm="<realm>", version="1", challenge="<base64url>"
```

**Parameters**:

- `realm`: Server identifier (REQUIRED)
- `version`: Protocol version (REQUIRED, must be "1")
- `challenge`: Base64url-encoded JSON challenge (REQUIRED)

**Example**:

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api-v1", version="1", challenge="eyJ2IjoxLCJhbGciOi..."
Content-Type: application/json

{
  "error": "wallet_auth_required",
  "detail": "Sign the challenge using your Solana wallet."
}
```


### 3.2 Authorization Header (Client → Server)

**Format**:

```
Authorization: WebX403 addr="<base58>", sig="<base58>", challenge="<base64url>", ts="<rfc3339>", nonce="<random>", bind="<method:path>"
```

**Parameters**:

- `addr`: Wallet public key in base58 (REQUIRED)
- `sig`: Ed25519 signature in base58 (REQUIRED)
- `challenge`: Challenge from WWW-Authenticate (REQUIRED)
- `ts`: ISO 8601/RFC 3339 timestamp (REQUIRED)
- `nonce`: Random value ≥96 bits (REQUIRED)
- `bind`: Request binding, format "METHOD:PATH" (OPTIONAL)

**Example**:

```http
GET /protected HTTP/1.1
Host: api.example.com
Authorization: WebX403 addr="5Gv8...", sig="3kYz...", challenge="eyJ2Ijo...", ts="2025-11-05T10:30:00Z", nonce="X8p2...", bind="GET:/protected"
```


---

## 4. Challenge Format

### 4.1 JSON Structure

The challenge is a JSON object with the following fields:

```json
{
  "v": 1,
  "alg": "ed25519-solana",
  "nonce": "E2o6p0q0Zl5PBjXc",
  "ts": "2025-11-05T10:30:00Z",
  "aud": "https://api.example.com",
  "method": "GET",
  "path": "/protected",
  "uaBind": false,
  "originBind": true,
  "serverId": "api-v1",
  "exp": "2025-11-05T10:31:00Z",
  "ext": {}
}
```


### 4.2 Field Definitions

| Field | Type | Required | Description |
| :-- | :-- | :-- | :-- |
| `v` | integer | Yes | Protocol version (must be 1) |
| `alg` | string | Yes | Algorithm (must be "ed25519-solana") |
| `nonce` | string | Yes | Server-generated random value |
| `ts` | string | Yes | Challenge creation timestamp (ISO 8601) |
| `aud` | string | Yes | Target audience (origin URL) |
| `method` | string | Yes | HTTP method |
| `path` | string | Yes | Request path |
| `uaBind` | boolean | Yes | Require User-Agent binding |
| `originBind` | boolean | Yes | Require Origin binding |
| `serverId` | string | Yes | Server identifier |
| `exp` | string | Yes | Expiration timestamp (ISO 8601) |
| `ext` | object | No | Extension data |

### 4.3 Encoding

Challenges MUST be:

1. Serialized as JSON with **sorted keys**
2. Encoded using **base64url** (RFC 4648, no padding)

### 4.4 Lifetime

- Default TTL: **60 seconds**
- Maximum recommended TTL: **300 seconds**
- Challenges MUST NOT be accepted after `exp` timestamp

---

## 5. Authorization Format

### 5.1 Signing String

The signing string is constructed as follows:

```
WebX403 Challenge

domain: <aud>
server: <serverId>
nonce: <nonce>
ts: <ts>
method: <method>
path: <path>

payload: <json-challenge>
```

**Example**:

```
WebX403 Challenge

domain: [https://api.example.com](https://api.example.com)
server: api-v1
nonce: E2o6p0q0Zl5PBjXc
ts: 2025-11-05T10:30:00Z
method: GET
path: /protected

payload: {"alg":"ed25519-solana","aud":"https://api.example.com",...}
```


### 5.2 Signature Generation

1. Construct signing string
2. Encode as UTF-8 bytes
3. Sign with Ed25519 using wallet private key
4. Encode signature as base58

### 5.3 Nonce Generation

Nonces MUST be:

- Cryptographically random
- At least 96 bits (12 bytes)
- Unique within TTL window
- Never reused with same wallet address

---

## 6. Verification Algorithm

### 6.1 Server Verification Steps

1. **Parse Authorization header**
    - Extract all required parameters
    - Fail if any required parameter missing
2. **Decode challenge**
    - Base64url decode challenge string
    - Parse JSON
    - Fail if invalid format
3. **Validate protocol version**
    - Check `v == 1`
    - Fail if unsupported version
4. **Validate algorithm**
    - Check `alg == "ed25519-solana"`
    - Fail if unsupported algorithm
5. **Check expiration**
    - Parse `exp` timestamp
    - Check `current_time < exp`
    - Fail if expired
6. **Validate audience**
    - Check `aud == expected_audience`
    - Fail if mismatch
7. **Validate server ID**
    - Check `serverId == expected_server_id`
    - Fail if mismatch
8. **Check timestamp skew**
    - Parse `ts` from Authorization
    - Check `|current_time - ts| <= clock_skew`
    - Default skew: 120 seconds
    - Fail if outside skew window
9. **Verify method/path binding**
    - If `bindMethodPath` enabled OR `bind` parameter present:
        - Check `method == challenge.method`
        - Check `path == challenge.path`
        - If `bind` parameter: check format "METHOD:PATH"
        - Fail if mismatch
10. **Verify origin binding**
    - If `originBind == true`:
        - Extract Origin or Referer header
        - Check origin matches `aud`
        - Fail if mismatch
11. **Verify User-Agent binding**
    - If `uaBind == true`:
        - Check User-Agent header exists
        - Fail if missing
12. **Check replay**
    - If replay store configured:
        - Check nonce not seen for this address
        - Store `addr:nonce` with TTL
        - Fail if nonce reused
13. **Verify signature**
    - Decode `addr` from base58 to public key
    - Decode `sig` from base58 to signature bytes
    - Reconstruct signing string
    - Verify Ed25519 signature
    - Fail if invalid signature
14. **Token gate check** (optional)
    - If token gate configured:
        - Call token gate function with address
        - Fail if not authorized
15. **Success**
    - Return authenticated user
    - Attach address to request context

### 6.2 Error Responses

On verification failure, server MUST:

- Return HTTP 403
- Include new WWW-Authenticate header
- Include error in response body

---

## 7. Security Considerations

### 7.1 Threats Considered

1. **Replay attacks**: Mitigated by nonce + TTL + replay store
2. **Cross-endpoint replay**: Mitigated by method/path binding
3. **Cross-origin replay**: Mitigated by origin binding
4. **Man-in-the-middle**: Requires HTTPS
5. **Clock skew attacks**: Mitigated by timestamp validation

### 7.2 Threats Not Fully Solved

1. **Compromised wallet**: No defense at protocol level
2. **Malicious browser extension**: Requires user vigilance
3. **Phishing**: Wallets should display challenge details

### 7.3 Recommendations

- **ALWAYS use HTTPS** in production
- **Enable replay protection** for high-value operations
- **Use method/path binding** for state-changing requests
- **Set short TTL** (60 seconds recommended)
- **Implement rate limiting** to prevent abuse
- **Monitor for anomalies** (unusual patterns, IPs)


### 7.4 Privacy Considerations

- Wallet addresses are **public information**
- Challenges do not leak sensitive data
- No PII required for authentication
- Consider address rotation for privacy-sensitive apps

---

## 8. Extension Mechanisms

### 8.1 ext Field

The `ext` field in challenges supports custom data:

```json
{
  "ext": {
    "gate": "nft-holders",
    "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "minBalance": 1,
    "scopes": ["read:nfts", "write:metadata"]
  }
}
```


### 8.2 Token Gating

Servers MAY implement token gating by checking:

- NFT ownership
- SPL token balance
- On-chain program data
- External oracle data


### 8.3 Custom Scopes

Use `ext.scopes` for permission scoping:

```typescript
{
  ext: {
    scopes: ["read:wallet", "write:nfts", "admin:settings"]
  }
}
```


---

## 9. Error Handling

### 9.1 Error Codes

| Error Code | Description |
| :-- | :-- |
| `wallet_auth_required` | No authentication provided |
| `invalid_challenge` | Malformed challenge |
| `challenge_expired` | Challenge TTL exceeded |
| `invalid_signature` | Signature verification failed |
| `replay_detected` | Nonce already used |
| `token_gate_failed` | Token requirements not met |
| `method_path_mismatch` | Binding verification failed |
| `origin_mismatch` | Origin binding failed |

### 9.2 Error Response Format

```json
{
  "error": "challenge_expired",
  "detail": "Challenge expired at 2025-11-05T10:31:00Z"
}
```


---

## 10. Examples

### 10.1 Complete HTTP Transcript

**Request 1: Initial Request**

```http
GET /protected HTTP/1.1
Host: api.example.com
```

**Response 1: Challenge**

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api-v1", version="1", challenge="eyJ2IjoxLCJhbGciOiJlZDI1NTE5LXNvbGFuYSIsIm5vbmNlIjoiRTJvNnAwcTBabDVQQmpYYyIsInRzIjoiMjAyNS0xMS0wNVQxMDozMDowMFoiLCJhdWQiOiJodHRwczovL2FwaS5leGFtcGxlLmNvbSIsIm1ldGhvZCI6IkdFVCIsInBhdGgiOiIvcHJvdGVjdGVkIiwidWFCaW5kIjpmYWxzZSwib3JpZ2luQmluZCI6dHJ1ZSwic2VydmVySWQiOiJhcGktdjEiLCJleHAiOiIyMDI1LTExLTA1VDEwOjMxOjAwWiIsImV4dCI6e319"
Content-Type: application/json

{
  "error": "wallet_auth_required",
  "detail": "Sign the challenge using your Solana wallet."
}
```

**Request 2: Authenticated Request**

```http
GET /protected HTTP/1.1
Host: api.example.com
Authorization: WebX403 addr="5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR", sig="3kYz8X2p9Q5m7nL4kF9sD1pR8hG6jV3wT2yN5xM8qE4rZ7pW9nK2mV5xC8dT3yL6fR9sE4hJ8pQ2mN5kV7xW3tY9rL6sE8pD4nF2kJ5xM7yR3wT8pV9qN6mC5sE7hL4kF2pJ9xR8yN3wT5mV7qE6sD8pL4kJ2nF9xR5yM3wT8pV6qN7mE9sC4hL5kF8pJ2xR7yN3wT9mV5qE6sD8pL4kJ2nF", challenge="eyJ2IjoxLCJhbGciOiJlZDI1NTE5LXNvbGFuYSIsIm5vbmNlIjoiRTJvNnAwcTBabDVQQmpYYyIsInRzIjoiMjAyNS0xMS0wNVQxMDozMDowMFoiLCJhdWQiOiJodHRwczovL2FwaS5leGFtcGxlLmNvbSIsIm1ldGhvZCI6IkdFVCIsInBhdGgiOiIvcHJvdGVjdGVkIiwidWFCaW5kIjpmYWxzZSwib3JpZ2luQmluZCI6dHJ1ZSwic2VydmVySWQiOiJhcGktdjEiLCJleHAiOiIyMDI1LTExLTA1VDEwOjMxOjAwWiIsImV4dCI6e319", ts="2025-11-05T10:30:15Z", nonce="X8p2q9R4m7L5kJ3nW6yT8pD", bind="GET:/protected"
```

**Response 2: Success**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Welcome!",
  "wallet": "5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR",
  "timestamp": "2025-11-05T10:30:15Z"
}
```


### 10.2 cURL Examples

```bash
# Get challenge
curl -i [https://api.example.com/protected](https://api.example.com/protected)

# Send authenticated request (after signing)
curl -H 'Authorization: WebX403 addr="5Gv8...", sig="3kYz...", challenge="eyJ2...", ts="2025-11-05T10:30:15Z", nonce="X8p2...", bind="GET:/protected"' \
  [https://api.example.com/protected](https://api.example.com/protected)
```


---

## Appendix A: Test Vectors

### Test Vector 1: Valid Challenge

**Challenge JSON**:

```json
{
  "alg": "ed25519-solana",
  "aud": "https://api.example.com",
  "exp": "2025-11-05T10:31:00Z",
  "ext": {},
  "method": "GET",
  "nonce": "test-nonce-12345",
  "originBind": true,
  "path": "/protected",
  "serverId": "test-server",
  "ts": "2025-11-05T10:30:00Z",
  "uaBind": false,
  "v": 1
}
```

**Base64url Encoded**:

```
eyJhbGciOiJlZDI1NTE5LXNvbGFuYSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiZXhwIjoiMjAyNS0xMS0wNVQxMDozMTowMFoiLCJleHQiOnt9LCJtZXRob2QiOiJHRVQiLCJub25jZSI6InRlc3Qtbm9uY2UtMTIzNDUiLCJvcmlnaW5CaW5kIjp0cnVlLCJwYXRoIjoiL3Byb3RlY3RlZCIsInNlcnZlcklkIjoidGVzdC1zZXJ2ZXIiLCJ0cyI6IjIwMjUtMTEtMDVUMTA6MzA6MDBaIiwidWFCaW5kIjpmYWxzZSwidioxMX0
```


---

## Appendix B: Implementation Checklist

### Client Implementation

- [ ] HTTP 403 detection
- [ ] WWW-Authenticate parsing
- [ ] Challenge decoding
- [ ] Wallet connection
- [ ] Message signing
- [ ] Authorization header building
- [ ] Request retry logic


### Server Implementation

- [ ] Challenge generation
- [ ] WWW-Authenticate header
- [ ] Authorization parsing
- [ ] Timestamp validation
- [ ] Signature verification
- [ ] Replay protection
- [ ] Token gating (optional)
- [ ] Error responses

---

**End of Specification**

Based on industry standards from RFC specifications and creator-focused protocol documentation, here's an updated version formatted for GitHub:

***

# WebX403 Protocol Specification

**Version:** 1.0.0
**Status:** Stable
**Date:** November 2025
**Authors:** WebX403 Contributors
**License:** MIT

## Abstract

WebX403 is an HTTP-native authentication protocol that leverages HTTP 403 status codes for challenge-response authentication using Solana wallet signatures. This specification defines the protocol's message formats, verification procedures, security model, and extension mechanisms, enabling developers to implement stateless, cryptographically secure authentication for Web3 applications.[^1][^2][^3]

## Status of This Document

This document represents the current stable specification of the WebX403 protocol. Implementations should reference this version for production deployments. Future versions will maintain backward compatibility where feasible.[^4][^5]

## Table of Contents

1. [Introduction](#1-introduction)
2. [Protocol Overview](#2-protocol-overview)
3. [HTTP Headers](#3-http-headers)
4. [Challenge Format](#4-challenge-format)
5. [Authorization Format](#5-authorization-format)
6. [Verification Algorithm](#6-verification-algorithm)
7. [Security Considerations](#7-security-considerations)
8. [Extension Mechanisms](#8-extension-mechanisms)
9. [Error Handling](#9-error-handling)
10. [Implementation Guide](#10-implementation-guide)
11. [Examples](#11-examples)
12. [References](#12-references)

***

## 1. Introduction

### 1.1 Purpose

Traditional web authentication mechanisms depend on centralized identity providers, session management, and credential storage. WebX403 addresses these limitations by providing a **decentralized, stateless authentication protocol** that leverages Solana wallet cryptography and standard HTTP semantics.[^6][^3][^1]

### 1.2 Design Principles

**HTTP-Native Integration**
Utilizes standard HTTP 403 status codes and authentication headers without requiring custom transport layers.[^2][^7]

**Zero Server State**
Eliminates session storage requirements through cryptographic verification, enabling horizontal scalability.[^1][^6]

**Cryptographic Security**
Employs Ed25519 signatures with replay protection, timestamp validation, and request binding.[^8][^3]

**Developer Experience**
Simple implementation with clear error semantics and extensible architecture.[^9][^10]

**Web3 Native**
Built specifically for Solana ecosystem with support for token gating and on-chain verification.[^11][^12]

### 1.3 Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.[^4][^1]

**Wallet**
A Solana Ed25519 keypair consisting of a public key (address) and private key used for signing operations.[^11]

**Challenge**
A server-generated authentication task containing a nonce, timestamp, and request metadata.[^3][^7]

**Signature**
An Ed25519 signature computed over the challenge using the wallet's private key.[^8]

**Nonce**
A cryptographically random, single-use value for replay attack prevention.[^3]

**TTL**
Time-To-Live duration for challenge validity.[^1]

### 1.4 Notational Conventions

JSON object keys are sorted lexicographically throughout this specification. Base64url encoding follows RFC 4648 without padding. Timestamp formats conform to ISO 8601 / RFC 3339.[^8][^1]

***

## 2. Protocol Overview

### 2.1 Authentication Flow

```
Client                                    Server
  |                                         |
  |  (1) GET /protected                     |
  |---------------------------------------->|
  |                                         |
  |  (2) 403 Forbidden                      |
  |      WWW-Authenticate: WebX403 ...  |
  |<----------------------------------------|
  |                                         |
  |  [User reviews and signs challenge]     |
  |                                         |
  |  (3) GET /protected                     |
  |      Authorization: WebX403 ...     |
  |---------------------------------------->|
  |                                         |
  |  [Server verifies signature]            |
  |                                         |
  |  (4) 200 OK                             |
  |      X-Authenticated-Address: ...       |
  |<----------------------------------------|
  |                                         |
```


### 2.2 Protocol Identifier

**Authentication Scheme:** `WebX403`
**Protocol Version:** `1`
**Signature Algorithm:** `ed25519-solana`

All implementations MUST include `version="1"` in authentication headers.[^7][^8]

### 2.3 Transport Requirements

This protocol REQUIRES HTTPS (TLS 1.2 or higher) for all production deployments to prevent man-in-the-middle attacks and credential interception.[^3][^1]

***

## 3. HTTP Headers

### 3.1 WWW-Authenticate Response Header

Sent by the server when authentication is required.[^7]

**Syntax:**

```
WWW-Authenticate: WebX403 realm="<realm>", version="1", challenge="<base64url>"
```

**Parameters:**


| Parameter | Type | Required | Description |
| :-- | :-- | :-- | :-- |
| `realm` | string | Yes | Server identifier or protection space |
| `version` | string | Yes | Protocol version (MUST be "1") |
| `challenge` | string | Yes | Base64url-encoded challenge JSON |

**Example:**

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api.example.com", version="1", challenge="eyJ2IjoxLCJhbGciOiJlZDI1NTE5LXNvbGFuYSIsIm5vbmNlIjoiRTJvNnAw..."
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "error": "wallet_auth_required",
  "error_description": "Authenticate using your Solana wallet to access this resource."
}
```


### 3.2 Authorization Request Header

Sent by the client with signed authentication credentials.[^7]

**Syntax:**

```
Authorization: WebX403 addr="<base58>", sig="<base58>", challenge="<base64url>", ts="<iso8601>", nonce="<string>", bind="<string>"
```

**Parameters:**


| Parameter | Type | Required | Description |
| :-- | :-- | :-- | :-- |
| `addr` | string | Yes | Wallet public key (base58) |
| `sig` | string | Yes | Ed25519 signature (base58) |
| `challenge` | string | Yes | Original challenge from server |
| `ts` | string | Yes | Client timestamp (ISO 8601) |
| `nonce` | string | Yes | Client-generated random nonce (≥96 bits) |
| `bind` | string | No | Request binding ("METHOD:PATH") |

**Example:**

```http
GET /protected HTTP/1.1
Host: api.example.com
Authorization: WebX403 addr="5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR", sig="3kYz8X2p9Q5m7nL4kF9sD1pR8hG6jV3wT2yN5xM8qE...", challenge="eyJ2IjoxLCJhbGci...", ts="2025-11-05T10:30:15Z", nonce="X8p2q9R4m7L5kJ3nW6yT8pD", bind="GET:/protected"
Accept: application/json
```


### 3.3 Optional Response Headers

**X-Authenticated-Address**
Servers MAY include this header in successful responses to communicate the authenticated wallet address:[^5][^1]

```http
HTTP/1.1 200 OK
X-Authenticated-Address: 5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR
Content-Type: application/json
```


***

## 4. Challenge Format

### 4.1 JSON Structure

Challenges are JSON objects with mandatory and optional fields:[^8][^1]

```json
{
  "v": 1,
  "alg": "ed25519-solana",
  "nonce": "E2o6p0q0Zl5PBjXc",
  "ts": "2025-11-05T10:30:00Z",
  "aud": "https://api.example.com",
  "method": "GET",
  "path": "/protected",
  "uaBind": false,
  "originBind": true,
  "serverId": "api-v1",
  "exp": "2025-11-05T10:31:00Z",
  "ext": {}
}
```


### 4.2 Field Specification

| Field | Type | Required | Description |
| :-- | :-- | :-- | :-- |
| `v` | integer | Yes | Protocol version (MUST be 1) |
| `alg` | string | Yes | Signature algorithm (MUST be "ed25519-solana") |
| `nonce` | string | Yes | Server nonce (≥96 bits entropy) |
| `ts` | string | Yes | Challenge creation time (ISO 8601) |
| `aud` | string | Yes | Target origin (scheme + host + port) |
| `method` | string | Yes | HTTP method being authenticated |
| `path` | string | Yes | Request path including query string |
| `uaBind` | boolean | Yes | Require User-Agent header validation |
| `originBind` | boolean | Yes | Require Origin header validation |
| `serverId` | string | Yes | Server or service identifier |
| `exp` | string | Yes | Challenge expiration time (ISO 8601) |
| `ext` | object | No | Extension data for custom features |

### 4.3 Encoding and Serialization

1. JSON keys MUST be sorted lexicographically[^8]
2. No whitespace in serialized output
3. Base64url encoding per RFC 4648 (no padding)
4. UTF-8 character encoding

**Example Encoding Process:**

```javascript
const challenge = { /* sorted fields */ };
const json = JSON.stringify(challenge);
const base64url = Buffer.from(json).toString('base64url');
```


### 4.4 Challenge Lifetime

**Recommended TTL:** 60 seconds
**Maximum TTL:** 300 seconds
**Clock Skew Tolerance:** ±120 seconds

Challenges MUST be rejected if `current_time > exp`.[^1][^3]

***

## 5. Authorization Format

### 5.1 Signing Message Construction

The message signed by the client follows this exact format:[^3][^8]

```
WebX403 Challenge

domain: <aud>
server: <serverId>
nonce: <nonce>
ts: <ts>
method: <method>
path: <path>

payload: <json-challenge>
```

**Field Sources:**

- `domain`, `server`, `nonce`, `ts`, `method`, `path`: From challenge JSON
- `json-challenge`: Lexicographically sorted JSON with no whitespace

**Example:**

```
WebX403 Challenge

domain: https://api.example.com
server: api-v1
nonce: E2o6p0q0Zl5PBjXc
ts: 2025-11-05T10:30:00Z
method: GET
path: /protected

payload: {"alg":"ed25519-solana","aud":"https://api.example.com","exp":"2025-11-05T10:31:00Z","ext":{},"method":"GET","nonce":"E2o6p0q0Zl5PBjXc","originBind":true,"path":"/protected","serverId":"api-v1","ts":"2025-11-05T10:30:00Z","uaBind":false,"v":1}
```


### 5.2 Signature Generation

1. Construct signing message per Section 5.1
2. Encode message as UTF-8 bytes
3. Sign bytes using Ed25519 with wallet private key
4. Encode 64-byte signature as base58

**Reference Implementation:**

```typescript
import { sign } from '@noble/ed25519';
import bs58 from 'bs58';

function signChallenge(message: string, privateKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = sign(messageBytes, privateKey);
  return bs58.encode(signature);
}
```


### 5.3 Client Nonce Requirements

Client nonces MUST satisfy:[^3]

- Minimum entropy: 96 bits (12 bytes)
- Cryptographically secure random generation
- Unique per authentication attempt
- Never reused with same wallet address

**Generation Example:**

```typescript
import { randomBytes } from 'crypto';

function generateNonce(): string {
  return randomBytes(16).toString('base64url');
}
```


***

## 6. Verification Algorithm

### 6.1 Server Validation Sequence

Servers MUST perform the following checks in order:[^13][^1][^3]

#### Step 1: Parse Authorization Header

Extract all parameters from the `Authorization` header. Fail with `invalid_request` if malformed.

#### Step 2: Decode Challenge

Base64url decode and parse challenge JSON. Fail with `invalid_challenge` if decoding fails.

#### Step 3: Validate Protocol Version

```
assert challenge.v == 1
```

Fail with `unsupported_version` if version mismatch.

#### Step 4: Validate Algorithm

```
assert challenge.alg == "ed25519-solana"
```

Fail with `unsupported_algorithm` if algorithm unsupported.

#### Step 5: Check Expiration

```
assert current_time < parse_timestamp(challenge.exp)
```

Fail with `challenge_expired` if expired.

#### Step 6: Validate Audience

```
assert challenge.aud == expected_origin
```

Fail with `audience_mismatch` if audience invalid.

#### Step 7: Validate Server ID

```
assert challenge.serverId == expected_server_id
```

Fail with `server_id_mismatch` if mismatch.

#### Step 8: Check Timestamp Skew

```
client_ts = parse_timestamp(auth.ts)
assert abs(current_time - client_ts) <= 120_seconds
```

Fail with `timestamp_skew` if outside tolerance window.

#### Step 9: Verify Method/Path Binding

```
if challenge.method OR auth.bind present:
  assert request.method == challenge.method
  assert request.path == challenge.path
```

Fail with `binding_mismatch` if mismatch.

#### Step 10: Verify Origin Binding

```
if challenge.originBind == true:
  origin = request.headers['Origin'] OR extract_origin(request.headers['Referer'])
  assert origin == challenge.aud
```

Fail with `origin_mismatch` if mismatch.

#### Step 11: Verify User-Agent Binding

```
if challenge.uaBind == true:
  assert request.headers['User-Agent'] exists
```

Fail with `user_agent_required` if missing.

#### Step 12: Check Replay Attack

```
if replay_store.exists(auth.addr, auth.nonce):
  fail with 'replay_detected'
replay_store.add(auth.addr, auth.nonce, ttl=challenge.exp - challenge.ts)
```


#### Step 13: Verify Signature

```
signing_message = construct_signing_message(challenge)
public_key = base58_decode(auth.addr)
signature = base58_decode(auth.sig)
assert ed25519_verify(signing_message, signature, public_key)
```

Fail with `invalid_signature` if verification fails.

#### Step 14: Token Gate Verification

```
if token_gate_enabled:
  assert check_token_requirements(auth.addr)
```

Fail with `token_gate_failed` if requirements not met.[^12][^11]

#### Step 15: Success

Attach authenticated address to request context and proceed with request processing.

### 6.2 Verification Failure Responses

All verification failures MUST return HTTP 403 with a fresh challenge:[^7]

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api.example.com", version="1", challenge="<new_challenge>"
Content-Type: application/json

{
  "error": "invalid_signature",
  "error_description": "Signature verification failed. Request a new challenge."
}
```


***

## 7. Security Considerations

### 7.1 Threat Model

**Protected Against:**

1. **Replay Attacks** - Mitigated through nonce tracking and timestamp validation[^3]
2. **Cross-Endpoint Replay** - Method/path binding prevents challenge reuse across endpoints[^3]
3. **Cross-Origin Attacks** - Origin binding prevents challenge use from different origins[^1]
4. **Time-Based Attacks** - Expiration timestamps and clock skew limits[^3]
5. **Signature Forgery** - Ed25519 cryptographic strength[^8]

**Not Protected Against:**

1. **Compromised Private Keys** - Protocol cannot detect stolen wallet keys[^11]
2. **Malicious Signing** - Users must validate challenge content before signing[^3]
3. **Phishing** - User education and wallet UI improvements required[^11]

### 7.2 Implementation Requirements

**HTTPS Mandatory**
All production implementations MUST use TLS 1.2 or higher. The protocol provides no confidentiality or integrity protection at the transport layer.[^1][^3]

**Replay Protection**
High-value or state-changing operations MUST implement nonce tracking with a persistent store (Redis, database).[^3]

**Rate Limiting**
Servers SHOULD implement rate limiting on:

- Challenge generation (prevent DoS)
- Failed authentication attempts (prevent brute force)
- Per-wallet authentication requests[^1]

**Entropy Requirements**
All nonces MUST use cryptographically secure random number generators. Never use predictable values (timestamps, counters, UUIDs).[^3]

### 7.3 Privacy Considerations

**Public Information**
Wallet addresses are public blockchain identifiers. Applications handling sensitive data should consider:

- Address rotation strategies
- Zero-knowledge proof integration
- Off-chain identity layers[^12][^11]

**Metadata Leakage**
Challenges contain request metadata (method, path, origin). Sensitive path parameters should be avoided or normalized.[^1]

### 7.4 Cryptographic Agility

This version specifies Ed25519 exclusively. Future versions MAY introduce algorithm negotiation. Implementations MUST reject unknown `alg` values.[^8][^1]

***

## 8. Extension Mechanisms

### 8.1 Extension Data Field

The `ext` object in challenges enables protocol extensions without breaking compatibility:[^5][^1]

```json
{
  "ext": {
    "gate": {
      "type": "nft",
      "collection": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "minAmount": 1
    },
    "scopes": ["read:wallet", "write:nfts"],
    "metadata": {
      "appVersion": "1.2.3",
      "features": ["token-gating", "replay-protection"]
    }
  }
}
```


### 8.2 Token Gating

Servers MAY enforce token-based access control by validating on-chain data:[^12][^11]

**NFT Ownership:**

```json
{
  "ext": {
    "gate": {
      "type": "nft",
      "collection": "<collection-address>",
      "minAmount": 1
    }
  }
}
```

**SPL Token Balance:**

```json
{
  "ext": {
    "gate": {
      "type": "token",
      "mint": "<token-mint-address>",
      "minBalance": 100
    }
  }
}
```

**Custom Programs:**

```json
{
  "ext": {
    "gate": {
      "type": "program",
      "program": "<program-id>",
      "accounts": ["<account-address>"]
    }
  }
}
```


### 8.3 Scope-Based Authorization

Applications MAY implement fine-grained permissions using scopes:[^5][^1]

```json
{
  "ext": {
    "scopes": [
      "read:profile",
      "read:nfts",
      "write:metadata",
      "admin:settings"
    ]
  }
}
```

Servers validate scopes during verification and enforce permissions in application logic.

### 8.4 Custom Extension Registration

Future extensions should document:

1. Extension identifier (namespaced key in `ext`)
2. Data structure specification
3. Validation requirements
4. Security considerations
5. Example implementations[^10][^5]

***

## 9. Error Handling

### 9.1 Error Response Format

All errors return HTTP 403 with a JSON body:[^7][^1]

```json
{
  "error": "<error_code>",
  "error_description": "<human_readable_description>",
  "error_uri": "https://docs.webx403.org/errors/<error_code>"
}
```


### 9.2 Standard Error Codes

| Error Code | Description | Recommended Action |
| :-- | :-- | :-- |
| `wallet_auth_required` | No authentication provided | Sign the challenge and retry |
| `invalid_request` | Malformed authorization header | Check header format |
| `invalid_challenge` | Challenge decode/parse failed | Request new challenge |
| `unsupported_version` | Protocol version not supported | Upgrade client implementation |
| `unsupported_algorithm` | Algorithm not supported | Check supported algorithms |
| `challenge_expired` | Challenge TTL exceeded | Request new challenge |
| `audience_mismatch` | Wrong origin/audience | Verify target URL |
| `server_id_mismatch` | Wrong server identifier | Check server configuration |
| `timestamp_skew` | Client timestamp out of range | Sync system clock |
| `binding_mismatch` | Method/path binding failed | Verify request matches challenge |
| `origin_mismatch` | Origin header validation failed | Check CORS configuration |
| `user_agent_required` | User-Agent header missing | Include User-Agent header |
| `replay_detected` | Nonce already used | Generate new nonce |
| `invalid_signature` | Signature verification failed | Re-sign with correct key |
| `token_gate_failed` | Token requirements not met | Acquire required tokens |

### 9.3 Error Response Examples

**Challenge Expired:**

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api.example.com", version="1", challenge="<new_challenge>"
Content-Type: application/json

{
  "error": "challenge_expired",
  "error_description": "Challenge expired at 2025-11-05T10:31:00Z. A new challenge has been issued.",
  "error_uri": "https://docs.webx403.org/errors/challenge_expired"
}
```

**Token Gate Failed:**

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api.example.com", version="1", challenge="<new_challenge>"
Content-Type: application/json

{
  "error": "token_gate_failed",
  "error_description": "Requires ownership of NFT from collection 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "error_uri": "https://docs.webx403.org/errors/token_gate_failed"
}
```


***

## 10. Implementation Guide

### 10.1 Server Implementation Checklist

- [ ] Challenge generation with secure random nonces
- [ ] WWW-Authenticate header formatting
- [ ] Authorization header parsing
- [ ] JSON challenge encoding/decoding
- [ ] Ed25519 signature verification
- [ ] Timestamp validation with clock skew tolerance
- [ ] Replay protection with nonce tracking
- [ ] Method/path binding validation
- [ ] Origin binding validation
- [ ] Token gate integration (optional)
- [ ] Error response formatting
- [ ] Rate limiting
- [ ] HTTPS enforcement[^9][^10]


### 10.2 Client Implementation Checklist

- [ ] HTTP 403 detection and handling
- [ ] WWW-Authenticate header parsing
- [ ] Challenge decoding and presentation to user
- [ ] Wallet connection and key access
- [ ] Signing message construction
- [ ] Ed25519 signature generation
- [ ] Authorization header formatting
- [ ] Automatic retry on challenge expiration
- [ ] Error handling and user feedback
- [ ] Secure nonce generation[^10][^9]


### 10.3 Testing Requirements

**Server Tests:**

- Valid signature acceptance
- Invalid signature rejection
- Expired challenge rejection
- Replay attack prevention
- Method/path binding enforcement
- Origin binding enforcement
- Token gate validation
- Clock skew handling
- Error response formatting[^10]

**Client Tests:**

- Challenge parsing
- Signature generation
- Header formatting
- Retry logic
- Error recovery
- Nonce uniqueness[^10]


### 10.4 Security Auditing

Implementations SHOULD undergo security review focusing on:

- Cryptographic implementation correctness
- Random number generation quality
- Replay protection effectiveness
- Time synchronization handling
- Error message information leakage[^3]

***

## 11. Examples

### 11.1 Complete Authentication Flow

**Step 1: Initial Request**

```http
GET /api/nfts HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Step 2: Challenge Response**

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: WebX403 realm="api.example.com", version="1", challenge="eyJ2IjoxLCJhbGciOiJlZDI1NTE5LXNvbGFuYSIsIm5vbmNlIjoiRTJvNnAwcTBabDVQQmpYYyIsInRzIjoiMjAyNS0xMS0wNVQxMDozMDowMFoiLCJhdWQiOiJodHRwczovL2FwaS5leGFtcGxlLmNvbSIsIm1ldGhvZCI6IkdFVCIsInBhdGgiOiIvYXBpL25mdHMiLCJ1YUJpbmQiOmZhbHNlLCJvcmlnaW5CaW5kIjp0cnVlLCJzZXJ2ZXJJZCI6ImFwaS1leGFtcGxlLWNvbSIsImV4cCI6IjIwMjUtMTEtMDVUMTA6MzE6MDBaIiwiZXh0Ijp7fX0"
Content-Type: application/json
Cache-Control: no-store

{
  "error": "wallet_auth_required",
  "error_description": "Authenticate using your Solana wallet to access this resource."
}
```

**Decoded Challenge:**

```json
{
  "v": 1,
  "alg": "ed25519-solana",
  "nonce": "E2o6p0q0Zl5PBjXc",
  "ts": "2025-11-05T10:30:00Z",
  "aud": "https://api.example.com",
  "method": "GET",
  "path": "/api/nfts",
  "uaBind": false,
  "originBind": true,
  "serverId": "api-example-com",
  "exp": "2025-11-05T10:31:00Z",
  "ext": {}
}
```

**Step 3: User Signs Challenge**

Signing message presented to user:

```
WebX403 Challenge

domain: https://api.example.com
server: api-example-com
nonce: E2o6p0q0Zl5PBjXc
ts: 2025-11-05T10:30:00Z
method: GET
path: /api/nfts

payload: {"alg":"ed25519-solana","aud":"https://api.example.com","exp":"2025-11-05T10:31:00Z","ext":{},"method":"GET","nonce":"E2o6p0q0Zl5PBjXc","originBind":true,"path":"/api/nfts","serverId":"api-example-com","ts":"2025-11-05T10:30:00Z","uaBind":false,"v":1}
```

**Step 4: Authenticated Request**

```http
GET /api/nfts HTTP/1.1
Host: api.example.com
Authorization: WebX403 addr="5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR", sig="3kYz8X2p9Q5m7nL4kF9sD1pR8hG6jV3wT2yN5xM8qE4rZ7pW9nK2mV5xC8dT3yL6fR9sE4hJ8pQ2mN5kV7xW3tY9rL6sE8pD4nF2kJ5xM7yR3wT8pV9qN6mC5sE7hL4kF2pJ9xR8yN3wT5mV7qE6sD8pL4kJ2nF9xR5yM3wT8pV6qN7mE9sC4hL5kF8pJ2xR7yN3wT9mV5qE6sD8pL4kJ2nF", challenge="eyJ2IjoxLCJhbGciOiJlZDI1NTE5LXNvbGFuYSIsIm5vbmNlIjoiRTJvNnAwcTBabDVQQmpYYyIsInRzIjoiMjAyNS0xMS0wNVQxMDozMDowMFoiLCJhdWQiOiJodHRwczovL2FwaS5leGFtcGxlLmNvbSIsIm1ldGhvZCI6IkdFVCIsInBhdGgiOiIvYXBpL25mdHMiLCJ1YUJpbmQiOmZhbHNlLCJvcmlnaW5CaW5kIjp0cnVlLCJzZXJ2ZXJJZCI6ImFwaS1leGFtcGxlLWNvbSIsImV4cCI6IjIwMjUtMTEtMDVUMTA6MzE6MDBaIiwiZXh0Ijp7fX0", ts="2025-11-05T10:30:15Z", nonce="X8p2q9R4m7L5kJ3nW6yT8pD", bind="GET:/api/nfts"
Accept: application/json
```

**Step 5: Success Response**

```http
HTTP/1.1 200 OK
X-Authenticated-Address: 5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR
Content-Type: application/json

{
  "nfts": [
    {
      "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "name": "Example NFT #1",
      "image": "https://arweave.net/..."
    }
  ]
}
```


### 11.2 Token-Gated Access Example

**Challenge with Token Gate:**

```json
{
  "v": 1,
  "alg": "ed25519-solana",
  "nonce": "T9kL2mN5pQ8rV4xW",
  "ts": "2025-11-05T14:00:00Z",
  "aud": "https://premium.example.com",
  "method": "GET",
  "path": "/exclusive/content",
  "uaBind": false,
  "originBind": true,
  "serverId": "premium-api",
  "exp": "2025-11-05T14:01:00Z",
  "ext": {
    "gate": {
      "type": "nft",
      "collection": "GateKeeper1111111111111111111111111111111",
      "minAmount": 1
    },
    "scopes": ["read:premium"]
  }
}
```


### 11.3 cURL Examples

**Get initial challenge:**

```bash
curl -i https://api.example.com/protected
```

**Send authenticated request:**

```bash
curl -H 'Authorization: WebX403 addr="5Gv8...", sig="3kYz...", challenge="eyJ2...", ts="2025-11-05T10:30:15Z", nonce="X8p2...", bind="GET:/protected"' \
  https://api.example.com/protected
```

**JavaScript fetch example:**

```javascript
// Step 1: Get challenge
const response = await fetch('https://api.example.com/protected');
const wwwAuth = response.headers.get('WWW-Authenticate');
const challenge = extractChallenge(wwwAuth);

// Step 2: Sign challenge
const signature = await wallet.signMessage(constructSigningMessage(challenge));

// Step 3: Send authenticated request
const authedResponse = await fetch('https://api.example.com/protected', {
  headers: {
    'Authorization': `WebX403 addr="${wallet.publicKey}", sig="${signature}", challenge="${challenge}", ts="${new Date().toISOString()}", nonce="${generateNonce()}", bind="GET:/protected"`
  }
});
```


***

## 12. References

### Normative References

**RFC 2119** - Key words for use in RFCs to Indicate Requirement Levels
**RFC 3986** - Uniform Resource Identifier (URI): Generic Syntax
**RFC 4648** - The Base16, Base32, and Base64 Data Encodings
**RFC 5234** - Augmented BNF for Syntax Specifications
**RFC 7230** - Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing
**RFC 7235** - Hypertext Transfer Protocol (HTTP/1.1): Authentication
**RFC 8259** - The JavaScript Object Notation (JSON) Data Interchange Format
**ISO 8601** - Date and time format[^4][^7][^1]

### Informative References

**RFC 6749** - The OAuth 2.0 Authorization Framework
**RFC 8120** - Mutual Authentication Protocol for HTTP
**Ed25519** - High-speed high-security signatures
**Solana Documentation** - https://docs.solana.com[^11][^1][^3]

### Implementation Libraries

**Server:**

- `webx403/server` (Node.js/TypeScript)
- `webx403-python` (Python)
- `webx403-go` (Go)

**Client:**

- `webx403/client` (Browser/Node.js)
- `webx403/react` (React hooks)
- `webx403-flutter` (Mobile)

***

## Appendix A: Test Vectors

### A.1 Valid Challenge

**Input Challenge JSON (sorted keys):**

```json
{"alg":"ed25519-solana","aud":"https://test.example.com","exp":"2025-11-05T10:31:00Z","ext":{},"method":"GET","nonce":"test-nonce-123","originBind":false,"path":"/test","serverId":"test-server","ts":"2025-11-05T10:30:00Z","uaBind":false,"v":1}
```

**Base64url Encoded:**

```
eyJhbGciOiJlZDI1NTE5LXNvbGFuYSIsImF1ZCI6Imh0dHBzOi8vdGVzdC5leGFtcGxlLmNvbSIsImV4cCI6IjIwMjUtMTEtMDVUMTA6MzE6MDBaIiwiZXh0Ijp7fSwibWV0aG9kIjoiR0VUIiwibm9uY2UiOiJ0ZXN0LW5vbmNlLTEyMyIsIm9yaWdpbkJpbmQiOmZhbHNlLCJwYXRoIjoiL3Rlc3QiLCJzZXJ2ZXJJZCI6InRlc3Qtc2VydmVyIiwidHMiOiIyMDI1LTExLTA1VDEwOjMwOjAwWiIsInVhQmluZCI6ZmFsc2UsInYiOjF9
```


### A.2 Signing Message

**Constructed Message:**

```
WebX403 Challenge

domain: https://test.example.com
server: test-server
nonce: test-nonce-123
ts: 2025-11-05T10:30:00Z
method: GET
path: /test

payload: {"alg":"ed25519-solana","aud":"https://test.example.com","exp":"2025-11-05T10:31:00Z","ext":{},"method":"GET","nonce":"test-nonce-123","originBind":false,"path":"/test","serverId":"test-server","ts":"2025-11-05T10:30:00Z","uaBind":false,"v":1}
```


***

## Appendix B: IANA Considerations

### B.1 Authentication Scheme Registration

This specification registers the "WebX403" authentication scheme in the HTTP Authentication Scheme Registry:

**Scheme Name:** WebX403
**Reference:** This specification
**Notes:** Challenge-response authentication using Solana wallet signatures[^7][^1]

***

## Appendix C: Change Log

### Version 1.0.0 (November 2025)

- Initial stable release
- Core authentication flow specification
- Ed25519-Solana signature algorithm
- Token gating extension mechanism
- Security considerations documentation[^4][^5]

***

## Authors

WebX403 Contributors

For questions, contributions, or security disclosures, visit:
**GitHub:** [https://github.com/webx403](https://github.com/ByrgerBib/webx403)
**Documentation:** [https://webx403.dev/](https://webx403.github.io/webx403-docs/)

***

**License:** MIT
**Copyright:** 2025 WebX403 Contributors
