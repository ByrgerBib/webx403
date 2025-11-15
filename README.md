# WebX403

> **Decentralized Authentication for the Modern Web**  
> Leverage Solana wallet signatures for passwordless, sessionless API access.

[![npm](https://img.shields.io/npm/v/webx403-client)](https://www.npmjs.com/package/webx403-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/ByrgerBib/webx403/blob/main/LICENSE)

---

## What is WebX403?

WebX403 transforms how users authenticate with web applications. Instead of passwords, sessions, or OAuth flows, users prove ownership of their Solana wallet through cryptographic signatures. The entire exchange happens over standard HTTP—no blockchain transactions required.

**Think of it as:** HTTP Basic Auth, but instead of username:password, you prove you control a wallet address.

---

## Why WebX403?

### ✨ For Developers
- **Zero backend sessions** – Stateless by design, scales infinitely
- **10-minute integration** – Drop-in middleware for Express/Fastify/FastAPI
- **Production-ready security** – Ed25519 signatures, replay protection, challenge expiry
- **Token-gate anything** – Restrict access based on NFT/token ownership

### 🔐 For Users
- **No passwords to remember** – Your wallet is your identity
- **No registration forms** – Connect and go
- **Privacy-first** – No email, phone, or personal data required
- **Full control** – You own your authentication credentials

---

## Quick Example

### Frontend (React)

```typescript
import { WebX403Client } from 'webx403-client';

const client = new WebX403Client();

// One line to authenticate
await client.connect('phantom');
const { ok, address } = await client.authenticate({
  resource: 'https://api.yourapp.com/user/profile'
});

if (ok) console.log(`Logged in as ${address}`);
```

### Backend (Express)

```typescript
import { createWebX403, inMemoryLRU } from 'webx403-server';

const webx = createWebX403({
  issuer: 'yourapp-api',
  audience: 'https://api.yourapp.com',
  replayStore: inMemoryLRU()
});

app.use(webx.middleware());

app.get('/user/profile', (req, res) => {
  // req.webx403User is automatically populated
  res.json({ wallet: req.webx403User.address });
});
```

**That's it.** No session management. No JWT secret rotation. No password hashing.

---

## How It Works

WebX403 uses HTTP's native `403 Forbidden` status as the authentication trigger:

```
1. Client requests /protected → Server responds 403 + challenge
2. Client signs challenge with wallet → Sends signed Authorization header
3. Server verifies signature → Grants access (200 OK)
```

The challenge is time-limited (60s default), single-use, and cryptographically bound to the request method and path. Replay attacks are prevented through nonce tracking.

**Technical Deep Dive:** [Read the Protocol Spec](docs/COMPLETE_SPECIFICATION.md)

---

## Installation

### Client (Browser/Node.js)
```bash
npm install webx403-client
```

### Server
```bash
# Node.js (Express/Fastify)
npm install webx403-server

# Python (FastAPI)
pip install webx403
```

---

## Supported Wallets

| Wallet | Browser Extension | Mobile | Status |
|--------|------------------|--------|--------|
| **Phantom** | ✅ | ✅ WalletConnect | Fully Supported |
| **Backpack** | ✅ | ❌ | Fully Supported |
| **Solflare** | ✅ | ✅ WalletConnect | Fully Supported |
| **Custom Keypairs** | ✅ Node.js | ✅ Node.js | For Scripts/Bots |

---

## Use Cases

### 🎮 **NFT-Gated Content**
Restrict access to holders of specific NFT collections.

```typescript
const webx = createWebX403({
  issuer: 'nft-club',
  audience: 'https://api.myclub.io',
  tokenGate: async (address) => {
    return await checkNFTOwnership(address, 'ClubNFTMintAddress');
  }
});
```

### 🤖 **Autonomous Agents**
Scripts and bots can authenticate using keypairs (no browser required).

```typescript
import { Keypair } from '@solana/web3.js';
import { WebX403Client } from 'webx403-client';

const keypair = Keypair.fromSecretKey(secretKeyBytes);
const client = new WebX403Client({ keypair });

await client.authenticate({ resource: 'https://api.bot.io/data' });
```

### 🌐 **Multi-Chain dApps**
Use Solana wallets as universal login for any web service (not just Solana apps).

---

## Security Model

WebX403 employs defense-in-depth:

| Protection | Implementation |
|-----------|----------------|
| **Replay Prevention** | Single-use nonces stored in Redis/memory |
| **Time-Limited Challenges** | 60-second expiry with clock skew tolerance |
| **Request Binding** | Signatures tied to HTTP method + path |
| **Origin Validation** | Optional CORS-style origin checking |
| **No Blockchain Calls** | Verification happens entirely off-chain |

**Threat Model Analysis:** [Read SECURITY.md](SECURITY.md)

---

## Package Structure

```
webx403/
├── packages/
│   ├── ts-client/      # Browser & Node.js SDK
│   ├── ts-server/      # Express & Fastify middleware
│   ├── py-server/      # FastAPI middleware
│   └── py-client/      # Python client (for scripts)
├── docs/
│   └── COMPLETE_SPECIFICATION.md  # RFC-style protocol spec
└── tests/              # Full test coverage
```

---

## Ecosystem

- **GitHub**: [ByrgerBib/webx403](https://github.com/ByrgerBib/webx403)
- **npm Client**: [webx403-client](https://www.npmjs.com/package/webx403-client)
- **npm Server**: [webx403-server](https://www.npmjs.com/package/webx403-server)
- **PyPI**: [webx403](https://pypi.org/project/webx403/)

---

## Contributing

WebX403 is open source under the MIT license. Contributions welcome!

```bash
git clone https://github.com/ByrgerBib/webx403.git
cd webx403
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT © 2025 ByrgerBib

---

## Why "WebX403"?

Because `403 Forbidden` is the HTTP status code that starts the authentication dance. The "X" represents the decentralized, wallet-based future of web authentication.

**No usernames. No passwords. Just cryptography.** 🔐

