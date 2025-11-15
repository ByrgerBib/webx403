# WebX403 Security Guide

**Building secure, wallet-authenticated APIs.**

---

## Table of Contents

1. [Security Model Overview](#security-model-overview)
2. [Production Checklist](#production-checklist)
3. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
4. [Configuration Best Practices](#configuration-best-practices)
5. [Reporting Security Issues](#reporting-security-issues)

---

## Security Model Overview

WebX403's security relies on four pillars:

### 1. **Cryptographic Signatures**
Every request is signed with the user's Ed25519 private key. The server verifies the signature against the wallet's public key. Without the private key, authentication is impossible.

### 2. **Time-Limited Challenges**
Challenges expire after 60 seconds (configurable). Old challenges cannot be reused, limiting the window for attacks.

### 3. **Replay Protection**
Each authentication uses a unique nonce. The server tracks used nonces to prevent replay attacks.

### 4. **Request Binding**
Signatures can be bound to specific HTTP methods and paths, preventing signature reuse across different endpoints.

---

## Production Checklist

Before deploying WebX403 to production, ensure you've implemented these safeguards:

### ✅ **Critical (Must-Have)**

- [ ] **Use HTTPS exclusively** – Never run WebX403 over plain HTTP in production
- [ ] **Enable replay protection** – Use Redis-backed nonce store (not in-memory)
- [ ] **Set short TTLs** – Keep challenge TTL ≤ 60 seconds
- [ ] **Bind method + path** – Enable `bindMethodPath: true`
- [ ] **Monitor for anomalies** – Log failed auth attempts

### 🟡 **Recommended**

- [ ] **Enable origin binding** – Prevent CSRF-style attacks
- [ ] **Rate limit challenge endpoints** – Prevent DoS via challenge generation
- [ ] **Implement token gating** – Restrict access by NFT/token ownership
- [ ] **Use a CDN with DDoS protection** – Cloudflare, AWS CloudFront, etc.
- [ ] **Rotate server identifiers** – Change `issuer` periodically

### 🔵 **Optional (High-Security Scenarios)**

- [ ] **User-Agent binding** – Lock challenges to specific browsers
- [ ] **IP allowlisting** – For internal APIs or admin panels
- [ ] **Multi-signature schemes** – Require multiple wallet approvals
- [ ] **Audit logging** – Store all authentication events

---

## Attack Vectors & Mitigations

### 🔴 **Replay Attacks**

**Attack:** Attacker captures a valid `Authorization` header and replays it.

**Mitigation:**
- Each nonce is single-use and tracked in a replay store
- Challenges have short TTLs (60s)
- Configure Redis for distributed replay tracking:

```typescript
import { createWebX403 } from 'webx403-server';
import Redis from 'ioredis';

const redis = new Redis();

const auth = createWebX403({
  issuer: 'my-api',
  audience: 'https://api.example.com',
  replayStore: {
    async check(key, ttl) {
      return await redis.exists(key) === 1;
    },
    async store(key, ttl) {
      await redis.setex(key, ttl, '1');
    }
  }
});
```

---

### 🟠 **Man-in-the-Middle (MITM)**

**Attack:** Attacker intercepts challenge/response over unencrypted connection.

**Mitigation:**
- **Mandatory HTTPS** – Encrypt all traffic
- **HSTS headers** – Force browsers to use HTTPS
- **Certificate pinning** – For high-security mobile apps

```typescript
// Express example: Force HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

---

### 🟡 **Challenge Harvesting**

**Attack:** Attacker requests many challenges to analyze patterns or find weaknesses.

**Mitigation:**
- **Rate limiting** – Limit challenges per IP/user
- **Challenge quotas** – Max N challenges per wallet per hour

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

---

### 🟢 **Cross-Site Request Forgery (CSRF)**

**Attack:** Malicious site tricks user into making authenticated requests.

**Mitigation:**
- **Origin binding** – Validate `Origin` header matches expected domain
- **SameSite cookies** – If using cookies alongside WebX403

```typescript
const auth = createWebX403({
  issuer: 'my-api',
  audience: 'https://api.example.com',
  originBinding: true  // ✅ Enable this
});
```

---

### 🔵 **Signature Malleability**

**Attack:** Attacker modifies signature to create valid alternative signature.

**Mitigation:**
- Ed25519 signatures are **not malleable** by design
- WebX403 uses Ed25519 exclusively (no ECDSA)
- No additional mitigation needed

---

## Configuration Best Practices

### Development vs. Production

| Setting | Development | Production |
|---------|------------|------------|
| **HTTPS** | Optional | **Mandatory** |
| **Replay Store** | In-Memory | Redis/DynamoDB |
| **TTL** | 300s (5 min) | 60s (1 min) |
| **Origin Binding** | Off | **On** |
| **Method/Path Binding** | Optional | **On** |
| **Rate Limiting** | Off | **On** (100 req/15min) |

### Recommended Production Config

```typescript
import { createWebX403 } from 'webx403-server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const auth = createWebX403({
  issuer: 'myapp-api-v1',
  audience: 'https://api.myapp.com',
  ttlSeconds: 60,
  bindMethodPath: true,
  originBinding: true,
  clockSkewSeconds: 30,  // Tolerate ±30s clock drift
  replayStore: {
    async check(key, ttl) {
      return await redis.exists(key) === 1;
    },
    async store(key, ttl) {
      await redis.setex(key, ttl, '1');
    }
  }
});
```

### Token Gating Security

When implementing token gates, **cache results** to prevent RPC spam:

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache

const auth = createWebX403({
  issuer: 'nft-club',
  audience: 'https://api.club.io',
  tokenGate: async (address) => {
    // Check cache first
    const cached = cache.get(address);
    if (cached !== undefined) return cached;

    // Query blockchain
    const hasNFT = await checkNFTOwnership(address, 'COLLECTION_MINT');
    
    // Cache result
    cache.set(address, hasNFT);
    return hasNFT;
  }
});
```

---

## Clock Skew Tolerance

WebX403 tolerates clock differences between client and server:

- **Default tolerance:** ±120 seconds
- **Configurable:** `clockSkewSeconds` option
- **Recommendation:** Keep servers NTP-synced

```typescript
const auth = createWebX403({
  // ... other options
  clockSkewSeconds: 30  // ±30s tolerance (stricter)
});
```

---

## Monitoring & Alerting

### Metrics to Track

1. **Authentication success rate** – Should be >95%
2. **Challenge generation rate** – Sudden spikes indicate potential abuse
3. **Replay detection rate** – Non-zero means attacks are being blocked
4. **Failed signature verifications** – High rate = client bugs or attacks

### Example: Logging Failed Attempts

```typescript
app.use((req, res, next) => {
  const originalSend = res.json;
  
  res.json = function(data) {
    if (res.statusCode === 403 && data.error) {
      console.warn('Auth failure:', {
        ip: req.ip,
        path: req.path,
        error: data.error,
        timestamp: new Date().toISOString()
      });
    }
    return originalSend.call(this, data);
  };
  
  next();
});
```

---

## Responsible Disclosure

### Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

**Instead, email:** [security@byrgerbib.dev](mailto:security@byrgerbib.dev)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and resolve critical issues within 7 days.

---

## Security Roadmap

Planned future enhancements:

- [ ] **Multi-sig support** – Require N-of-M wallet approvals
- [ ] **Hardware wallet integration** – Ledger, Trezor support
- [ ] **Audit logging backend** – PostgreSQL/MongoDB integration
- [ ] **Anomaly detection ML** – Auto-block suspicious patterns

---

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Ed25519 Cryptographic Strength](https://ed25519.cr.yp.to/)
- [Solana Wallet Security Best Practices](https://docs.solana.com/wallet-guide)

---

**Security is a shared responsibility.** Follow these guidelines, stay updated, and report issues promptly.

*Last updated: November 2025*

