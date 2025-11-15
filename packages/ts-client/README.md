# webx403-client

**Browser and Node.js client** for **WebX403** — enabling wallet-based authentication for your dApps and APIs.
Supports **Phantom**, **Backpack**, **Solflare**, and **custom Solana keypairs**.

---

## 🚀 Installation

```bash
npm install webx403-client
```

---

## ⚙️ Quick Usage (Browser)

```typescript
import { WebX403Client } from 'webx403-client';

const client = new WebX403Client();

// 1️⃣ Connect wallet
await client.connect('phantom');

// 2️⃣ Authenticate with your protected API
const result = await client.authenticate({
  resource: 'https://api.example.com/protected',
  method: 'GET',
});

if (result.ok) {
  console.log('✅ Authenticated as:', result.address);
  console.log('Response:', await result.response?.json());
} else {
  console.error('❌ Authentication failed:', result.error);
}
```

---

## 🌐 React Example

```tsx
import { useState } from 'react';
import { WebX403Client } from 'webx403-client';

export default function App() {
  const [client] = useState(() => new WebX403Client());
  const [address, setAddress] = useState<string | null>(null);

  const handleLogin = async () => {
    await client.connect('phantom');
    const result = await client.authenticate({
      resource: 'https://api.example.com/user/profile',
    });

    if (result.ok) setAddress(result.address!);
  };

  return (
    <div>
      <h1>WebX403 Client Demo</h1>
      {address ? (
        <p>✅ Connected as: {address}</p>
      ) : (
        <button onClick={handleLogin}>Connect Wallet</button>
      )}
    </div>
  );
}
```

---

## 🧠 Node.js Example (Keypair)

```typescript
import { WebX403Client } from 'webx403-client';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Load keypair from Base58 secret
const keypair = Keypair.fromSecretKey(bs58.decode('YOUR_SECRET_KEY_BASE58'));
const client = new WebX403Client({ keypair });

const result = await client.authenticate({
  resource: 'https://api.example.com/protected',
  method: 'GET',
});

if (result.ok) {
  console.log('✅ Authenticated as:', result.address);
}
```

---

## 🧩 API Reference

### `new WebX403Client(options?)`

Creates a new WebX403 client instance.

| Option     | Type      | Description                                     |
| ---------- | --------- | ----------------------------------------------- |
| `keypair?` | `Keypair` | (Node.js only) Use a Solana keypair for signing |
| `wallet?`  | `string`  | Wallet provider name (e.g. `"phantom"`)         |
| `debug?`   | `boolean` | Enable debug logging                            |

---

### `client.connect(wallet: WalletType)`

Connects to the specified wallet provider.
Supported wallets: `"phantom"`, `"backpack"`, `"solflare"`.

---

### `client.authenticate(options)`

Signs and sends an authenticated request.

| Option     | Type                     | Description                       |
| ---------- | ------------------------ | --------------------------------- |
| `resource` | `string`                 | Target API endpoint               |
| `method?`  | `string`                 | HTTP method (`GET`, `POST`, etc.) |
| `headers?` | `Record<string, string>` | Additional headers                |
| `body?`    | `object`                 | JSON payload (for POST/PUT)       |

**Returns:**

```typescript
{
  ok: boolean;
  address?: string;
  error?: string;
  response?: Response;
}
```

---

## 📚 Documentation

* [**Usage Examples**](../../USAGE_EXAMPLES.md) — Full production scenarios
* [**Quick Start Guide**](../../QUICK_START.md) — 5-minute setup
* [**Security Guide**](../../SECURITY.md) — Binding, replay, and TTL best practices

---

## 🛡️ Best Practices

* Always use **HTTPS** in production
* Use `method` + `path` binding for stronger request integrity
* Keep challenge TTL short (`60s` recommended)
* For backends, pair with `webx403-server` middleware

---

## 🪪 License

[MIT](../../LICENSE)

---
