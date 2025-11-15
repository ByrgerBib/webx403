# webx403-server

**Express & Fastify middleware** for **WebX403** wallet authentication.
Easily protect your API routes with Solana wallet–based signatures.

---

## 🚀 Installation

```bash
npm install webx403-server
```

---

## ⚙️ Quick Usage (Express)

```typescript
import express from 'express';
import { createWebX403, inMemoryLRU } from 'webx403-server';

const app = express();

// Create WebX403 instance
const webx = createWebX403({
  issuer: 'my-api',
  audience: 'https://api.example.com',
  replayStore: inMemoryLRU(), // Prevent replay attacks
});

// Apply middleware
app.use(webx.middleware());

// Protected route
app.get('/protected', (req, res) => {
  const user = (req as any).webx403User;
  res.json({ message: '✅ Authenticated', wallet: user.address });
});

app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
```

---

## ⚡ Fastify Integration

```typescript
import Fastify from 'fastify';
import { createWebX403, inMemoryLRU } from 'webx403-server';

const fastify = Fastify();

const webx = createWebX403({
  issuer: 'my-api',
  audience: 'https://api.example.com',
  replayStore: inMemoryLRU(),
});

// Add authentication hook
fastify.addHook('onRequest', webx.fastifyHook());

// Protected endpoint
fastify.get('/protected', async (req, reply) => {
  const user = (req as any).webx403User;
  return { message: '✅ Authenticated', wallet: user.address };
});

fastify.listen({ port: 3000 });
```

---

## 🔧 Options

| Option             | Type                                                 | Description                                              |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------- |
| **issuer**         | `string`                                             | Identifier for your API (e.g. `"my-api"`)                |
| **audience**       | `string`                                             | Expected audience or domain of your API                  |
| **ttlSeconds**     | `number` *(optional)*                                | Challenge time-to-live (default: `60`)                   |
| **bindMethodPath** | `boolean` *(optional)*                               | Require binding to HTTP method + path                    |
| **originBinding**  | `boolean` *(optional)*                               | Require origin header validation                         |
| **replayStore**    | `ReplayStore` *(optional)*                           | Used to detect and block replayed requests               |
| **tokenGate**      | `(address: string) => Promise<boolean>` *(optional)* | Async check for wallet-based access (e.g. NFT ownership) |

### Built-in Replay Stores

```typescript
import { inMemoryLRU, redisStore } from 'webx403-server';

inMemoryLRU();  // simple in-memory cache
redisStore();   // distributed cache via Redis (recommended for production)
```

---

## 🧩 Type Definitions

```typescript
interface WebX403Config {
  issuer: string;
  audience: string;
  ttlSeconds?: number;
  bindMethodPath?: boolean;
  originBinding?: boolean;
  replayStore?: ReplayStore;
  tokenGate?: (address: string) => Promise<boolean>;
}
```

Middleware injects the authenticated user into the request:

```typescript
interface WebX403User {
  address: string;     // Solana wallet address
  challenge: object;   // Challenge payload
}
```

Access it via:

```typescript
(req as any).webx403User
```

---

## 📚 Documentation

* [**USAGE_EXAMPLES.md**](../../USAGE_EXAMPLES.md) – Full production examples
* [**Quick Start Guide**](../../QUICK_START.md) – 5-minute setup
* [**Security Guide**](../../SECURITY.md) – Replay protection & binding

---

## 🧠 Best Practices

* Always use **HTTPS** in production
* Enable **`replayStore`** for replay protection
* Use **`bindMethodPath`** for method-level signing
* Apply **token gating** for gated-access endpoints
* Keep **TTL ≤ 60 seconds** for challenges

---

## 🪪 License

[MIT](../../LICENSE)

---
